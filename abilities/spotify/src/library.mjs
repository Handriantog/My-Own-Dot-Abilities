import { parseToolInput, spotifyUri } from "./inputs.mjs";
import { selectionTargets, resolveTracks, continuation } from "./targets.mjs";
import {
  catalogItem,
  catalogItems,
  normalize,
  ownerList,
  ownerItem,
  ownerText,
} from "./resolve.mjs";
import { SpotifyFailure } from "./errors.mjs";

async function choosePlaylist(client, input, targets) {
  if (targets.playlistUri || input.playlistUri)
    return { uri: targets.playlistUri ?? input.playlistUri };
  const offset = targets.playlistOffset ?? 0;
  const { body } = await client.request("playlists", {
    query: { limit: 10, offset },
  });
  const items = catalogItems(body?.items, 10).filter(
    (item) => item.type === "playlist" && item.private,
  );
  const exact = input.playlistName
    ? items.filter(
        (item) => normalize(item.name) === normalize(input.playlistName),
      )
    : [];
  const rawCount = Array.isArray(body?.items)
    ? Math.min(body.items.length, 10)
    : 0;
  const more = Number.isInteger(body?.total)
    ? body.total > offset + rawCount
    : Boolean(body?.next) && rawCount === 10;
  // A partial page cannot establish that a name is unique across the collection.
  if (exact.length === 1 && !more && offset === 0) return { uri: exact[0].uri };
  const choices = (exact.length ? exact : items).map((item) =>
    ownerItem(
      item,
      continuation("add_to_playlist", input, {
        ...targets,
        playlistUri: item.uri,
      }),
    ),
  );
  if (more && rawCount > 0 && offset + 10 <= 10000)
    choices.push({
      label: "More playlists",
      action: continuation("add_to_playlist", input, {
        ...targets,
        playlistOffset: offset + 10,
      }),
    });
  if (!choices.length) throw new SpotifyFailure("provider_error");
  return {
    outcome: ownerList(
      "Choose a private playlist",
      choices,
      "selection_needed",
    ),
  };
}
export function createLibraryTools(client) {
  const execute = async (tool, value, selection) => {
    const input = parseToolInput(tool, value);
    const resolution = await resolveTracks(
      client,
      tool,
      input,
      selectionTargets(tool, input, selection),
      { optional: tool === "create_playlist" },
    );
    if (resolution.outcome) return resolution.outcome;
    const targets = resolution.targets;
    if (tool === "save_tracks") {
      await client.request("save-tracks", {
        query: { uris: targets.trackUris.join(",") },
      });
      return ownerText("Tracks saved to Liked Songs.");
    }
    if (tool === "create_playlist") {
      const { body } = await client.request("create-playlist", {
        body: {
          name: input.name,
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
          public: false,
          collaborative: false,
        },
      });
      const playlist = catalogItem(body);
      if (!playlist || playlist.type !== "playlist")
        throw new SpotifyFailure("invalid_response", { uncertain: true });
      const item = ownerItem(playlist);
      if (targets.trackUris) {
        try {
          await client.request("add-items", {
            pathValues: { playlistId: playlist.id },
            body: { uris: targets.trackUris },
          });
        } catch {
          // Creation already succeeded, even if additions were definitely rejected.
          // The model cannot read the private card; never imply safe recreation.
          return {
            status: "uncertain",
            owner: {
              kind: "list",
              title:
                "Playlist created; additions were not confirmed. Check Spotify before requesting them again.",
              items: [
                item,
                {
                  label: "Unconfirmed tracks",
                  detail: `${targets.trackUris.length} tracks were not confirmed as added.`,
                },
              ],
              attribution: "Spotify",
            },
          };
        }
      }
      return ownerList("Private playlist created", [item]);
    }
    const chosen = await choosePlaylist(client, input, targets);
    if (chosen.outcome) return chosen.outcome;
    const playlistId = spotifyUri(chosen.uri, ["playlist"]).id;
    const { body } = await client.request("playlist", {
      pathValues: { playlistId },
    });
    const playlist = catalogItem(body);
    if (!playlist || playlist.uri !== chosen.uri || !playlist.private)
      throw new SpotifyFailure("permission_denied");
    await client.request("add-items", {
      pathValues: { playlistId },
      body: { uris: targets.trackUris },
    });
    return ownerList("Tracks added", [ownerItem(playlist)]);
  };
  return Object.fromEntries(
    ["create_playlist", "add_to_playlist", "save_tracks"].map((tool) => [
      tool,
      (input, selection) => execute(tool, input, selection),
    ]),
  );
}
