import { spotifyUri } from "./inputs.mjs";
export const normalize = (text) =>
  text
    .normalize("NFKC")
    .trim()
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("en-US");
// Plain text: the host renders escaped text nodes, never HTML/Markdown.
export const display = (text, length = 1000) =>
  typeof text === "string"
    ? text
        .replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/gu, " ")
        .slice(0, length)
    : "";
export function catalogItem(value) {
  if (!value || typeof value !== "object" || value.is_local === true)
    return null;
  const resource = spotifyUri(value.uri);
  if (
    !resource ||
    value.type !== resource.type ||
    (value.id !== undefined && value.id !== resource.id)
  )
    return null;
  const name = display(value.name) || `Unnamed ${resource.type}`;
  const artists = Array.isArray(value.artists)
    ? value.artists
        .slice(0, 20)
        .map((artist) => display(artist?.name))
        .filter(Boolean)
    : [];
  return {
    ...resource,
    name,
    artists,
    url: `https://open.spotify.com/${resource.type}/${resource.id}`,
    playable: value.is_playable !== false && !value.restrictions?.reason,
    private: value.public === false,
  };
}
export function catalogItems(items, maximum = 10) {
  const seen = new Set();
  return (Array.isArray(items) ? items.slice(0, maximum) : [])
    .map(catalogItem)
    .filter((item) => {
      if (!item || seen.has(item.uri)) return false;
      seen.add(item.uri);
      return true;
    });
}
export function ownerItem(
  item,
  action = { version: 1, kind: "item", type: item.type, uri: item.uri },
) {
  return {
    label: item.name,
    detail: display(
      [
        item.type,
        item.artists.join(", "),
        ...(!item.playable ? ["Unavailable"] : []),
      ].join(" · "),
      2000,
    ),
    url: item.url,
    ...(item.playable ? { action } : {}),
  };
}
export function resolveTarget(items, request) {
  const available = items.filter((item) => item && item.playable !== false);
  if (!available.length) return { kind: "missing" };
  const exact = available.filter(
    (item) =>
      normalize(item.name) === normalize(request.query) &&
      (!request.artist ||
        item.artists.some(
          (artist) => normalize(artist) === normalize(request.artist),
        )),
  );
  if (exact.length === 1) return { kind: "selected", item: exact[0] };
  return { kind: "choice", items: exact.length ? exact : available };
}
export function availableDevices(body) {
  const seen = new Set();
  return (Array.isArray(body?.devices) ? body.devices.slice(0, 50) : [])
    .filter((device) => {
      if (
        !device ||
        typeof device.id !== "string" ||
        !device.id.length ||
        device.id.length > 128 ||
        seen.has(device.id)
      )
        return false;
      seen.add(device.id);
      return true;
    })
    .map((device) => ({
      id: device.id,
      name: display(device.name, 200) || "Unnamed player",
      active: device.is_active === true,
      restricted: device.is_restricted !== false,
      volume: device.supports_volume === true,
    }));
}
export const ownerText = (text, status = "success") => ({
  status,
  owner: { kind: "text", text, attribution: "Spotify" },
});
export const ownerList = (title, items, status = "success") => ({
  status,
  owner: { kind: "list", title, items, attribution: "Spotify" },
});
