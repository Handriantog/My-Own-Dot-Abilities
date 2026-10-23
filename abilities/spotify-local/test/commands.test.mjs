import { test } from "node:test";
import assert from "node:assert/strict";
import { dispatchTool } from "../src/commands.mjs";
const track = "spotify:track:" + "A".repeat(22);
async function run(
  tool,
  args = {},
  reply = { ok: true, kind: "app-control", status: "success" },
  selection,
) {
  const calls = [];
  const result = await dispatchTool(
    { tool, arguments: args, settings: {}, selection },
    {
      capability: async (request) => {
        calls.push(request);
        return reply;
      },
      signal: new AbortController().signal,
    },
  );
  return { calls, result };
}
test("all native tools request only their declared capabilities", async () => {
  for (const [tool, args, action] of [
    ["play", {}, "play"],
    ["pause", {}, "pause"],
    ["next", {}, "next"],
    ["previous", {}, "previous"],
    ["volume", { percent: 25 }, "volume"],
    ["seek", { seconds: 3.5 }, "seek"],
    ["shuffle", { enabled: true }, "shuffle"],
    ["repeat", { enabled: false }, "repeat"],
  ]) {
    const { calls, result } = await run(tool, args);
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], {
      kind: "app-control",
      ruleId: "playback",
      command: { action, ...args },
    });
    assert.deepEqual(result, { status: "success" });
  }
});
test("plays canonical links or a private owner selection", async () => {
  for (const [args, selection] of [
    [{ uri: track }],
    [{ uri: "https://open.spotify.com/track/" + "A".repeat(22) + "?si=share" }],
    [{}, { uri: track }],
  ]) {
    const { calls } = await run("play", args, undefined, selection);
    assert.deepEqual(calls[0].command, { action: "play_uri", uri: track });
  }
});
test("UI commands have a separate permission", async () => {
  for (const [tool, args] of [
    ["search", { query: "synthetic song", category: "tracks" }],
    ["playlists", {}],
    ["save_current", {}],
    ["create_playlist", { name: "Test playlist" }],
  ]) {
    const { calls } = await run(tool, args);
    assert.equal(calls[0].ruleId, "library-ui");
    assert.deepEqual(calls[0].command, { action: tool, ...args });
  }
});
test("rejects invalid inputs without contacting the host", async () => {
  for (const [tool, args] of [
    ["pause", { script: "x" }],
    ["volume", { percent: 101 }],
    ["seek", { seconds: -1 }],
    ["shuffle", { enabled: 1 }],
    ["search", { query: " ", category: "tracks" }],
    ["create_playlist", { name: "x", public: true }],
    ["play", { uri: "https://example.com/track/x" }],
    ["add_to_playlist", { playlistUri: track, trackUri: track }],
    ["unknown", {}],
  ]) {
    const { calls, result } = await run(tool, args);
    assert.equal(calls.length, 0);
    assert.equal(result.status, "error");
  }
});
test("never retries an uncertain mutation", async () => {
  const { calls, result } = await run(
    "create_playlist",
    { name: "Test" },
    { ok: true, kind: "app-control", status: "uncertain" },
  );
  assert.equal(calls.length, 1);
  assert.deepEqual(result, { status: "uncertain" });
});
test("keeps returned Spotify labels in the private result only", async () => {
  const privateResult = {
    kind: "list",
    title: "Spotify",
    items: [{ label: "Private catalog title", action: { uri: track } }],
  };
  const { result } = await run(
    "search",
    { query: "test", category: "tracks" },
    { ok: true, kind: "app-control", status: "success", result: privateResult },
  );
  assert.deepEqual(result, {
    status: "selection_needed",
    owner: privateResult,
  });
});

test("adding a song chooses an exact recording before sending a mutation", async () => {
  const { calls, result } = await run(
    "add_to_playlist",
    { query: "test song", playlistName: "Test" },
    undefined,
    { uri: track },
  );
  assert.deepEqual(calls, [
    {
      kind: "app-control",
      ruleId: "library-ui",
      command: {
        action: "add_to_playlist",
        query: "test song",
        trackUri: track,
        playlistName: "Test",
      },
    },
  ]);
  assert.deepEqual(result, { status: "success" });
});
test("adding without a selected song searches and carries the requested playlist privately", async () => {
  const { calls, result } = await run(
    "add_to_playlist",
    { query: "test song", playlistName: "Test" },
    {
      ok: true,
      kind: "app-control",
      status: "success",
      result: {
        kind: "list",
        title: "Songs",
        items: [{ label: "Example", action: { uri: track } }],
      },
    },
  );
  assert.deepEqual(calls[0].command, {
    action: "search",
    query: "test song",
    category: "tracks",
  });
  assert.deepEqual(result.owner.items[0].action, {
    uri: track,
    playlistName: "Test",
  });
});
test("a selected track can request a private playlist choice, then mutate once", async () => {
  const { calls, result } = await run(
    "add_to_playlist",
    { query: "test song" },
    {
      ok: true,
      kind: "app-control",
      status: "success",
      result: {
        kind: "list",
        title: "Playlists",
        items: [{ label: "Test", action: { playlistName: "Test" } }],
      },
    },
    { uri: track },
  );
  assert.deepEqual(calls[0].command, { action: "playlists" });
  assert.deepEqual(result.owner.items[0].action, {
    uri: track,
    playlistName: "Test",
  });
  const final = await run(
    "add_to_playlist",
    { query: "test song" },
    undefined,
    result.owner.items[0].action,
  );
  assert.deepEqual(final.calls[0].command, {
    action: "add_to_playlist",
    query: "test song",
    trackUri: track,
    playlistName: "Test",
  });
});
