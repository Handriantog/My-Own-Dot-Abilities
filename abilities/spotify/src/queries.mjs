import { parseToolInput, parseSelection, invalid } from "./inputs.mjs";
import {
  catalogItem,
  catalogItems,
  ownerItem,
  ownerList,
  ownerText,
  availableDevices,
} from "./resolve.mjs";

export async function searchItems(client, input) {
  const { body } = await client.request("search", {
    query: {
      q: input.query,
      type: (input.types ?? ["track"]).join(","),
      limit: input.limit ?? 5,
    },
  });
  return (input.types ?? ["track"]).flatMap((type) =>
    catalogItems(body?.[`${type}s`]?.items, input.limit ?? 5).filter(
      (item) => item.type === type,
    ),
  );
}
export function createQueryTools(client) {
  return {
    async search(value, selection) {
      if (selection !== undefined) invalid();
      const input = parseToolInput("search", value);
      const items = await searchItems(client, input);
      return items.length
        ? ownerList(
            "Search results",
            items.map((item) => ownerItem(item)),
          )
        : ownerText("No results.");
    },
    async playback(value, selection) {
      parseToolInput("playback", value);
      if (selection !== undefined) invalid();
      const playback = await client.request("playback");
      let current = catalogItem(playback.body?.item);
      if (!current && playback.body?.currently_playing_type === "track") {
        const reply = await client.request("currently-playing");
        current = catalogItem(reply.body?.item);
      }
      const { body } = await client.request("devices");
      const devices = availableDevices(body);
      const item = current;
      const active = devices.some(
        (device) => device.active && !device.restricted,
      );
      const title = active
        ? playback.body?.is_playing
          ? "Playing"
          : "Paused or idle"
        : "Open Spotify and start a player, or explicitly choose an available device.";
      const items = [
        ...(item ? [ownerItem(item)] : []),
        ...devices.map((device) => ({
          label: device.name,
          detail: device.restricted
            ? "Restricted player"
            : device.active
              ? "Active player"
              : "Available player",
          ...(!device.restricted
            ? { action: { version: 1, kind: "device", id: device.id } }
            : {}),
        })),
      ];
      return items.length ? ownerList(title, items) : ownerText(title);
    },
    async playlists(value, choice) {
      const input = parseToolInput("playlists", value);
      const selection = parseSelection(choice);
      if (selection && selection.kind !== "playlist-page") invalid();
      const limit = selection?.limit ?? input.limit ?? 10;
      const offset = selection?.offset ?? 0;
      const { body } = await client.request("playlists", {
        query: { limit, offset },
      });
      const items = catalogItems(body?.items, limit)
        .filter((item) => item.type === "playlist")
        .map((item) => ownerItem(item));
      const rawCount = Array.isArray(body?.items)
        ? Math.min(body.items.length, limit)
        : 0;
      const more = Number.isInteger(body?.total)
        ? body.total > offset + rawCount
        : Boolean(body?.next) && rawCount === limit;
      if (more && rawCount > 0 && offset + limit <= 10000)
        items.push({
          label: "More playlists",
          action: {
            version: 1,
            kind: "playlist-page",
            offset: offset + limit,
            limit,
          },
        });
      return items.length
        ? ownerList("Your playlists", items)
        : ownerText("No playlists found.");
    },
  };
}
