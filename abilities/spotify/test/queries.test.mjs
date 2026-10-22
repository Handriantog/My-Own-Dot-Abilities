import test from "node:test";
import assert from "node:assert/strict";
import { createQueryTools } from "../src/queries.mjs";
import { createSpotifyClient } from "../src/spotify.mjs";
import { parseToolInput, parseSelection } from "../src/inputs.mjs";
import { normalize, resolveTarget, catalogItem } from "../src/resolve.mjs";
import { broker, http, track, playlist, device, IDS } from "./fixtures.mjs";
function tools(replies) {
  const fake = broker(replies);
  return { ...fake, ...createQueryTools(createSpotifyClient(fake)) };
}
test("search defaults to five tracks; all metadata stays in the owner result", async () => {
  const api = tools([
    http({ tracks: { items: [null, track({ artists: undefined }), track()] } }),
  ]);
  const result = await api.search({ query: "Synthetic Song" });
  assert.equal(result.status, "success");
  assert.equal(result.value, undefined);
  assert.equal(result.owner.attribution, "Spotify");
  assert.equal(result.owner.items.length, 1);
  assert.equal(result.owner.items[0].action.uri, `spotify:track:${IDS.track}`);
  assert.equal(
    result.owner.items[0].url,
    `https://open.spotify.com/track/${IDS.track}`,
  );
  assert.deepEqual(api.requests[0].query, {
    q: "Synthetic Song",
    type: "track",
    limit: 5,
  });
});
test("search supports four types with ten results per type and no arbitrary links", async () => {
  const api = tools([
    http({
      tracks: {
        items: [track({ external_urls: { spotify: "https://evil.example" } })],
      },
      playlists: { items: [playlist()] },
    }),
  ]);
  const result = await api.search({
    query: "synthetic",
    types: ["track", "artist", "album", "playlist"],
    limit: 10,
  });
  assert.equal(result.owner.items.length, 2);
  assert.equal(api.requests[0].query.type, "track,artist,album,playlist");
  assert.equal(JSON.stringify(result).includes("evil.example"), false);
});
for (const input of [
  { query: "" },
  { query: "   " },
  { query: "x", limit: 11 },
  { query: "x", types: [] },
  { query: "x", types: ["episode"] },
  { query: "x", types: ["track", "track"] },
  { query: "x", url: "https://example.com" },
  { query: "x".repeat(301) },
])
  test("rejects invalid or overbroad search before provider access", async () => {
    const api = tools([]);
    await assert.rejects(api.search(input));
    assert.equal(api.requests.length, 0);
  });
test("URI types, conflicting targets and unknown fields are rejected for every tool", () => {
  for (const [tool, input] of [
    ["play", { uri: "https://open.spotify.com/track/x" }],
    ["queue", { uri: `spotify:album:${IDS.album}` }],
    ["save_tracks", { uris: [`spotify:album:${IDS.album}`] }],
    ["play", { query: "x", uri: `spotify:track:${IDS.track}` }],
    ["volume", { percent: 101 }],
    ["pause", { command: "shell" }],
  ])
    assert.throws(() => parseToolInput(tool, input));
});
test("normalization handles NFKC, case and whitespace but preserves punctuation", () => {
  assert.equal(normalize("  Ｓｏｎｇ\t Title "), "song title");
  assert.notEqual(normalize("Song!"), normalize("Song"));
  const item = catalogItem(track());
  assert.deepEqual(
    resolveTarget([item], {
      query: " SYNTHETIC  song ",
      artist: "SYNTHETIC artist",
    }),
    { kind: "selected", item },
  );
  assert.equal(
    resolveTarget([item], { query: "Synthetic Song!" }).kind,
    "choice",
  );
});
test("duplicate titles and artists stay ambiguous; unavailable tracks cannot be selected", () => {
  const one = catalogItem(track());
  const two = catalogItem(
    track({ id: IDS.second, uri: `spotify:track:${IDS.second}` }),
  );
  assert.equal(
    resolveTarget([one, two], {
      query: "Synthetic Song",
      artist: "Synthetic Artist",
    }).kind,
    "choice",
  );
  assert.equal(
    resolveTarget([catalogItem(track({ is_playable: false }))], {
      query: "Synthetic Song",
    }).kind,
    "missing",
  );
  assert.equal(resolveTarget([], { query: "none" }).kind, "missing");
});
test("relinked tracks use the returned URI; missing IDs, mismatched types and local tracks are excluded", () => {
  const item = catalogItem(
    track({ linked_from: { uri: `spotify:track:${IDS.second}` } }),
  );
  assert.equal(item.uri, `spotify:track:${IDS.track}`);
  for (const value of [
    null,
    track({ uri: undefined }),
    track({ uri: `spotify:album:${IDS.album}` }),
    track({ is_local: true }),
  ])
    assert.equal(catalogItem(value), null);
});
test("playlist continuation is bounded structured data, never a provider URL", async () => {
  const api = tools([
    http({
      items: [playlist(), null],
      total: 12,
      next: "https://evil.example/steal",
    }),
    http({ items: [playlist({ name: "Another Page" })], total: 12 }),
  ]);
  const first = await api.playlists({ limit: 2 });
  const next = first.owner.items.at(-1).action;
  assert.deepEqual(next, {
    version: 1,
    kind: "playlist-page",
    offset: 2,
    limit: 2,
  });
  await api.playlists({ limit: 2 }, next);
  assert.deepEqual(api.requests[1].query, { limit: 2, offset: 2 });
  assert.equal(JSON.stringify(first).includes("evil.example"), false);
  for (const bad of [
    { ...next, version: 0 },
    { ...next, offset: 10001 },
    { ...next, url: "https://example.com" },
    {
      version: 1,
      kind: "item",
      type: "episode",
      uri: `spotify:episode:${IDS.track}`,
    },
  ])
    assert.throws(() => parseSelection(bad));
});
test("host-expired/account-mismatched references never belong in worker inputs; fresh lists carry no account state", async () => {
  assert.throws(() =>
    parseToolInput("playlists", { selectionRef: "old-account-reference" }),
  );
  const first = await tools([
    http({ items: [playlist()], total: 1 }),
  ]).playlists({});
  const second = await tools([http({ items: [], total: 0 })]).playlists({});
  assert.equal(first.owner.items.length, 1);
  assert.equal(second.owner.kind, "text");
});
test("empty playback and missing/restricted devices never silently choose a device", async () => {
  const api = tools([
    http("", 204, {}),
    http({
      devices: [
        device({ id: null }),
        device({ id: "restricted", is_restricted: true }),
        device({ id: "idle", is_active: false }),
      ],
    }),
  ]);
  const result = await api.playback({});
  assert.match(result.owner.title, /Open Spotify/);
  assert.equal(api.requests.length, 2);
  assert.equal(
    result.owner.items.some((item) => item.action?.id === "restricted"),
    false,
  );
});
test("playback metadata is owner-only plaintext with valid Spotify links", async () => {
  const result = await tools([
    http({
      is_playing: true,
      item: track({ name: "<script>sentinel</script>" }),
    }),
    http({ devices: [device()] }),
  ]).playback({});
  assert.equal(result.value, undefined);
  assert.equal(result.owner.items[0].label, "<script>sentinel</script>");
  assert.match(
    result.owner.items[0].url,
    /^https:\/\/open.spotify.com\/track\//,
  );
});

test("an incomplete track playback response uses the approved currently-playing route", async () => {
  const api = tools([
    http({ is_playing: true, currently_playing_type: "track", item: null }),
    http({ item: track() }),
    http({ devices: [device()] }),
  ]);
  const result = await api.playback({});
  assert.deepEqual(
    api.requests.map((request) => request.ruleId),
    ["playback", "currently-playing", "devices"],
  );
  assert.equal(result.owner.items[0].label, "Synthetic Song");
});
