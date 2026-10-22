import { parseSelection, invalid, spotifyUri } from "./inputs.mjs";
import { searchItems } from "./queries.mjs";
import { resolveTarget, ownerItem, ownerList } from "./resolve.mjs";
import { SpotifyFailure } from "./errors.mjs";
const canonical = (v) => JSON.stringify(v, Object.keys(v).sort());
export function selectionTargets(tool, input, choice) {
  const selection = parseSelection(choice);
  if (!selection) return {};
  if (selection.kind === "resolution") {
    if (
      selection.tool !== tool ||
      canonical(selection.input) !== canonical(input)
    )
      invalid();
    return selection.targets;
  }
  if (
    selection.kind === "device" &&
    ["play", "pause", "skip", "queue", "volume"].includes(tool)
  )
    return { deviceId: selection.id };
  if (selection.kind === "item") {
    if (
      selection.type === "track" &&
      [
        "play",
        "queue",
        "create_playlist",
        "add_to_playlist",
        "save_tracks",
      ].includes(tool)
    ) {
      if (
        (input.uri && input.uri !== selection.uri) ||
        (input.uris &&
          (input.uris.length !== 1 || input.uris[0] !== selection.uri))
      )
        invalid();
      return { trackUris: [selection.uri] };
    }
    if (selection.type === "playlist" && tool === "add_to_playlist")
      return { playlistUri: selection.uri };
    if (tool === "play") return { contextUri: selection.uri };
  }
  invalid();
}
export const continuation = (tool, input, targets) => ({
  version: 1,
  kind: "resolution",
  tool,
  input,
  targets,
});
export async function resolveTracks(
  client,
  tool,
  input,
  targets,
  { optional = false, context = false } = {},
) {
  if (targets.trackUris || targets.contextUri) return { targets };
  if (input.uris) return { targets: { ...targets, trackUris: input.uris } };
  if (input.uri) {
    const resource = spotifyUri(input.uri);
    if (resource.type !== "track" && !context) invalid();
    return {
      targets: {
        ...targets,
        ...(resource.type === "track"
          ? { trackUris: [input.uri] }
          : { contextUri: input.uri }),
      },
    };
  }
  if (!input.query) {
    if (!optional) invalid();
    return { targets };
  }
  const items = await searchItems(client, { query: input.query, limit: 10 });
  const resolved = resolveTarget(items, input);
  if (resolved.kind === "missing") throw new SpotifyFailure("provider_error");
  if (resolved.kind === "selected")
    return { targets: { ...targets, trackUris: [resolved.item.uri] } };
  return {
    outcome: ownerList(
      "Choose a recording",
      resolved.items.map((item) =>
        ownerItem(
          item,
          continuation(tool, input, { ...targets, trackUris: [item.uri] }),
        ),
      ),
      "selection_needed",
    ),
  };
}
