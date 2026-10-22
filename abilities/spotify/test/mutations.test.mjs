import test from "node:test";
import assert from "node:assert/strict";
import { dispatchTool } from "../src/dispatch.mjs";
import { createSpotifyClient } from "../src/spotify.mjs";
import {
  broker,
  http,
  track,
  playlist,
  device,
  IDS,
  SENTINEL,
} from "./fixtures.mjs";
const trackUri = `spotify:track:${IDS.track}`;
const playlistUri = `spotify:playlist:${IDS.playlist}`;
const devices = (...items) =>
  http({ devices: items.length ? items : [device()] });
const ack = () => http("", 204, {});
function run(tool, input, replies, selection, extra = {}) {
  const fake = broker(replies);
  return {
    requests: fake.requests,
    result: dispatchTool({
      tool,
      arguments: input,
      selection,
      client: createSpotifyClient({ ...fake, ...extra }),
      ...extra,
    }),
  };
}
function expectRequest(request, ruleId, query = {}, body, pathValues = {}) {
  assert.deepEqual(request, {
    kind: "https",
    ruleId,
    pathValues,
    query,
    ...(body === undefined ? {} : { body }),
  });
}
for (const [tool, input, rule, query, body] of [
  ["play", {}, "play", {}, {}],
  ["play", { uri: trackUri }, "play", {}, { uris: [trackUri] }],
  [
    "play",
    { uri: `spotify:album:${IDS.album}` },
    "play",
    {},
    { context_uri: `spotify:album:${IDS.album}` },
  ],
  ["pause", {}, "pause", {}],
  ["skip", {}, "next", {}],
  ["skip", { direction: "previous" }, "previous", {}],
  ["queue", { uri: trackUri }, "queue", { uri: trackUri }],
  ["volume", { percent: 0 }, "volume", { volume_percent: 0 }],
  ["volume", { percent: 100 }, "volume", { volume_percent: 100 }],
])
  test(`${tool} targets the discovered device explicitly with the exact rule and values`, async () => {
    const call = run(tool, input, [devices(), ack()]);
    assert.equal((await call.result).status, "success");
    assert.equal(call.requests.length, 2);
    expectRequest(call.requests[0], "devices");
    expectRequest(
      call.requests[1],
      rule,
      { device_id: "synthetic-device", ...query },
      body,
    );
  });

test("only explicit device choice transfers playback; transfer never starts unrelated content", async () => {
  const call = run("play", { device: "Bedroom", uri: trackUri }, [
    devices(
      device(),
      device({ id: "bedroom", name: "Bedroom", is_active: false }),
    ),
    ack(),
    ack(),
  ]);
  assert.equal((await call.result).status, "success");
  expectRequest(
    call.requests[1],
    "transfer",
    {},
    { device_ids: ["bedroom"], play: false },
  );
  expectRequest(
    call.requests[2],
    "play",
    { device_id: "bedroom" },
    { uris: [trackUri] },
  );
});
for (const item of [
  device({ is_active: false }),
  device({ is_restricted: true }),
  device({ id: null }),
])
  test("no active usable device causes no mutation", async () => {
    const call = run("play", {}, [devices(item)]);
    assert.equal((await call.result).status, "error");
    assert.equal(call.requests.length, 1);
  });
test("unsupported volume and vanished selected device do not transfer or retry", async () => {
  for (const [tool, input, selection, replies] of [
    [
      "volume",
      { percent: 50 },
      undefined,
      [devices(device({ supports_volume: false }))],
    ],
    ["play", {}, { version: 1, kind: "device", id: "vanished" }, [devices()]],
  ]) {
    const call = run(tool, input, replies, selection);
    assert.equal((await call.result).status, "error");
    assert.equal(call.requests.length, 1);
  }
  const lost = run("pause", {}, [
    devices(),
    http({ error: { message: SENTINEL } }, 404),
  ]);
  assert.equal((await lost.result).status, "error");
  assert.equal(lost.requests.length, 2);
  assert.equal(lost.requests[1].query.device_id, "synthetic-device");
});
test("duplicate device names need an owner choice; selection refreshes device availability", async () => {
  const input = { device: "Player", uri: trackUri };
  const first = run("play", input, [
    devices(
      device({ name: "Player" }),
      device({ id: "other", name: "Player" }),
    ),
  ]);
  const choice = await first.result;
  assert.equal(choice.status, "selection_needed");
  const next = run(
    "play",
    input,
    [devices(device({ id: "other", name: "Player" })), ack()],
    choice.owner.items[1].action,
  );
  assert.equal((await next.result).status, "success");
  assert.equal(next.requests.at(-1).query.device_id, "other");
});
test("exact local song resolution proceeds; duplicate recordings require choice before any mutation", async () => {
  const input = {
    name: "My test list",
    query: "Synthetic Song",
    artist: "Synthetic Artist",
  };
  const songs = [
    track(),
    track({ id: IDS.second, uri: `spotify:track:${IDS.second}` }),
  ];
  const first = run("create_playlist", input, [
    http({ tracks: { items: songs } }),
  ]);
  const choice = await first.result;
  assert.equal(choice.status, "selection_needed");
  assert.equal(first.requests.length, 1);
  const next = run(
    "create_playlist",
    input,
    [http(playlist()), ack()],
    choice.owner.items[1].action,
  );
  assert.equal((await next.result).status, "success");
  assert.equal(next.requests[0].ruleId, "create-playlist");
  assert.deepEqual(next.requests[1].body.uris, [`spotify:track:${IDS.second}`]);
  const exact = run(
    "queue",
    { query: "Synthetic Song", artist: "Synthetic Artist" },
    [http({ tracks: { items: [track()] } }), devices(), ack()],
  );
  assert.equal((await exact.result).status, "success");
  assert.equal(exact.requests.at(-1).query.uri, trackUri);
});
test("continuation cannot be used for a different command or silently altered arguments", async () => {
  const input = { query: "Synthetic Song" };
  const first = run("queue", input, [
    http({
      tracks: {
        items: [
          track(),
          track({ id: IDS.second, uri: `spotify:track:${IDS.second}` }),
        ],
      },
    }),
  ]);
  const choice = (await first.result).owner.items[0].action;
  for (const [tool, args] of [
    ["play", input],
    ["queue", { query: "Different" }],
  ]) {
    const call = run(tool, args, [], choice);
    assert.equal((await call.result).code, "permission_denied");
    assert.equal(call.requests.length, 0);
  }
});
test("creation is explicitly private/noncollaborative; additions use playlist ID and at most forty tracks", async () => {
  for (const count of [1, 40]) {
    const uris = Array.from(
      { length: count },
      (_, i) => `spotify:track:${String(i + 1).padStart(22, "0")}`,
    );
    const call = run(
      "create_playlist",
      { name: "Test list", description: "Synthetic only", uris },
      [http(playlist()), ack()],
    );
    assert.equal((await call.result).status, "success");
    expectRequest(
      call.requests[0],
      "create-playlist",
      {},
      {
        name: "Test list",
        description: "Synthetic only",
        public: false,
        collaborative: false,
      },
    );
    expectRequest(
      call.requests[1],
      "add-items",
      {},
      { uris },
      { playlistId: IDS.playlist },
    );
  }
});
test("saving tracks uses current library URI query and no profile request", async () => {
  const call = run("save_tracks", { uris: [trackUri] }, [ack()]);
  assert.equal((await call.result).status, "success");
  expectRequest(call.requests[0], "save-tracks", { uris: trackUri });
});
for (const response of [
  http(playlist({ public: true })),
  http(playlist({ public: null })),
  http({}, 403),
])
  test("public, unknown-privacy or denied playlists are never written", async () => {
    const call = run("add_to_playlist", { playlistUri, uris: [trackUri] }, [
      response,
    ]);
    assert.equal((await call.result).status, "error");
    assert.equal(call.requests.length, 1);
  });
test("private playlist is checked immediately before adding; provider enforces actual write access", async () => {
  const call = run("add_to_playlist", { playlistUri, uris: [trackUri] }, [
    http(playlist()),
    ack(),
  ]);
  assert.equal((await call.result).status, "success");
  expectRequest(call.requests[0], "playlist", {}, undefined, {
    playlistId: IDS.playlist,
  });
  expectRequest(
    call.requests[1],
    "add-items",
    {},
    { uris: [trackUri] },
    { playlistId: IDS.playlist },
  );
});
test("playlist-name resolution handles ambiguity and continuation without creating or storing a journal", async () => {
  const input = { playlistName: "Synthetic Playlist", uris: [trackUri] };
  const first = run("add_to_playlist", input, [
    http({ items: [playlist()], total: 11, next: "https://evil.example" }),
  ]);
  const result = await first.result;
  assert.equal(result.status, "selection_needed");
  assert.equal(first.requests.length, 1);
  const next = run(
    "add_to_playlist",
    input,
    [http({ items: [playlist({ name: "Other" })], total: 11 })],
    result.owner.items.at(-1).action,
  );
  assert.equal((await next.result).status, "selection_needed");
  assert.equal(next.requests[0].query.offset, 10);
});
for (const response of [http({}, 403), http({}, 503), new Error(SENTINEL)])
  test("create success plus add failure preserves private playlist link and never recreates", async () => {
    const call = run("create_playlist", { name: "Test", uris: [trackUri] }, [
      http(playlist()),
      response,
    ]);
    const result = await call.result;
    assert.equal(
      result.status,
      response.status === 403 ? "error" : "uncertain",
    );
    assert.match(result.owner.title, /created/);
    assert.equal(
      result.owner.items[0].url,
      `https://open.spotify.com/playlist/${IDS.playlist}`,
    );
    assert.equal(
      call.requests.filter((r) => r.ruleId === "create-playlist").length,
      1,
    );
    assert.equal(
      call.requests.filter((r) => r.ruleId === "add-items").length,
      1,
    );
    assert.equal(JSON.stringify(result).includes(SENTINEL), false);
  });
test("remote creation with unknown delivery never repeats or adds tracks", async () => {
  const call = run("create_playlist", { name: "Test", uris: [trackUri] }, [
    new Error(SENTINEL),
  ]);
  assert.equal((await call.result).status, "uncertain");
  assert.equal(call.requests.length, 1);
});
test("cancellation between creation and additions preserves partial result without another provider call", async () => {
  const controller = new AbortController();
  const requests = [];
  const client = createSpotifyClient({
    signal: controller.signal,
    capability: async (request) => {
      requests.push(request);
      controller.abort();
      return http(playlist());
    },
  });
  const result = await dispatchTool({
    tool: "create_playlist",
    arguments: { name: "Test", uris: [trackUri] },
    client,
    signal: controller.signal,
  });
  assert.equal(result.status, "uncertain");
  assert.equal(requests.length, 1);
});
test("invalid types, oversized lists, empty required targets and playlist names fail before networking", async () => {
  for (const [tool, input] of [
    ["save_tracks", { uris: [`spotify:album:${IDS.album}`] }],
    ["save_tracks", {}],
    ["queue", {}],
    ["create_playlist", { name: "" }],
    ["create_playlist", { name: "x".repeat(101) }],
    ["create_playlist", { name: "x", description: "x".repeat(301) }],
    ["save_tracks", { uris: Array(41).fill(trackUri) }],
  ]) {
    const call = run(tool, input, []);
    assert.equal((await call.result).status, "error");
    assert.equal(call.requests.length, 0);
  }
});

test("cancellation after a confirmed create retains its link and prevents the add step", async () => {
  const controller = new AbortController();
  const fake = broker([http(playlist()), ack()]);
  const transport = createSpotifyClient({ ...fake, signal: controller.signal });
  const client = {
    request: async (...args) => {
      const result = await transport.request(...args);
      if (args[0] === "create-playlist") controller.abort();
      return result;
    },
  };
  const result = await dispatchTool({
    tool: "create_playlist",
    arguments: { name: "Test", uris: [trackUri] },
    client,
    signal: controller.signal,
  });
  assert.equal(result.code, "cancelled");
  assert.equal(
    result.owner.items[0].url,
    `https://open.spotify.com/playlist/${IDS.playlist}`,
  );
  assert.equal(fake.requests.length, 1);
});
