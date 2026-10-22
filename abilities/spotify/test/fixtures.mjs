export const SENTINEL = "SPOTIFY_SENTINEL_SECRET_NAME_TOKEN";
export function http(
  body = {},
  status = 200,
  headers = { contentType: "application/json" },
) {
  return {
    ok: true,
    kind: "https",
    status,
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  };
}
export function broker(replies) {
  const requests = [];
  return {
    requests,
    capability: async (request) => {
      requests.push(request);
      const response = replies.shift();
      if (response instanceof Error) throw response;
      if (!response) throw new Error("Fixture exhausted");
      return response;
    },
  };
}
export const IDS = {
  track: "1".repeat(22),
  second: "2".repeat(22),
  playlist: "3".repeat(22),
  album: "4".repeat(22),
};
export function track(overrides = {}) {
  return {
    type: "track",
    id: IDS.track,
    uri: `spotify:track:${IDS.track}`,
    name: "Synthetic Song",
    artists: [{ name: "Synthetic Artist" }],
    is_playable: true,
    ...overrides,
  };
}
export function playlist(overrides = {}) {
  return {
    type: "playlist",
    id: IDS.playlist,
    uri: `spotify:playlist:${IDS.playlist}`,
    name: "Synthetic Playlist",
    public: false,
    ...overrides,
  };
}
export function device(overrides = {}) {
  return {
    id: "synthetic-device",
    name: "Synthetic Player",
    is_active: true,
    is_restricted: false,
    supports_volume: true,
    ...overrides,
  };
}
