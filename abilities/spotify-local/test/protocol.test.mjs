import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setImmediate as nextTurn } from "node:timers/promises";
import { fakeHost, init, invocation, reply } from "./fake-host.mjs";
import { validReply } from "../src/protocol.mjs";
const SENTINEL = "SYNTHETIC_PRIVATE_METADATA";
const http = (_value, status = 200, _headers = {}) => ({
  ok: true,
  kind: "app-control",
  status: status === 204 ? "uncertain" : "success",
});

const success = { status: "success", owner: { kind: "text", text: "Done." } };
test("fragmented UTF-8 frames and interleaved capability replies preserve IDs", async (t) => {
  const host = fakeHost(async (params, { capability }) => {
    assert.equal(params.arguments.query, "café");
    const calls = ["search", "devices"].map((ruleId) =>
      capability({ kind: "app-control", ruleId, command: { action: "pause" } }),
    );
    const results = await Promise.all(calls);
    assert.deepEqual(
      results.map((r) => r.status),
      ["success", "uncertain"],
    );
    return success;
  });
  t.after(host.close);
  await host.send(init);
  const bytes = Buffer.from(
    JSON.stringify({
      ...invocation,
      params: { ...invocation.params, arguments: { query: "café" } },
    }) + "\n",
  );
  for (const byte of bytes) host.input.write(Buffer.from([byte]));
  await nextTurn();
  const capabilities = host.messages.filter((m) => m.method === "capability");
  assert.equal(capabilities.length, 2);
  await host.send(reply(capabilities[1].id, http("", 204, {})));
  await host.send(reply(capabilities[0].id, http({})));
  assert.deepEqual(host.messages.at(-1), reply("invoke", success));
});

for (const [name, message] of Object.entries({
  "unknown method": { ...init, method: "execute" },
  "wrong version": { ...init, params: { apiVersion: 2 } },
  "unknown field": { ...init, token: SENTINEL },
  "numeric ID": { ...init, id: 1 },
  notification: { jsonrpc: "2.0", method: "ping", params: {} },
  "unsolicited response": reply("unknown", http({})),
  "invoke before init": invocation,
  "invalid settings schema": { ...init, params: [] },
}))
  test(`rejects ${name} without invoking or reflecting input`, async () => {
    let called = false;
    const host = fakeHost(() => {
      called = true;
      return success;
    });
    await host.send(message);
    assert.equal(called, false);
    assert.equal(host.output.writableEnded, true);
    assert.equal(JSON.stringify(host.messages).includes(SENTINEL), false);
  });

test("oversize and deeply nested frames close before invocation", async () => {
  for (const data of [
    "x".repeat(1048577),
    JSON.stringify({
      jsonrpc: "2.0",
      id: "init",
      method: "initialize",
      params: Array.from({ length: 26 }).reduce((v) => ({ v }), null),
    }) + "\n",
  ]) {
    const host = fakeHost(() => assert.fail("must not invoke"));
    host.input.write(data);
    await nextTurn();
    assert.equal(host.output.writableEnded, true);
  }
});

test("duplicate invocation IDs cannot replay a completed mutation", async (t) => {
  let calls = 0;
  const host = fakeHost(() => {
    calls++;
    return success;
  });
  t.after(host.close);
  await host.send(init);
  await host.send(invocation);
  await host.send(invocation);
  assert.equal(calls, 1);
  assert.equal(host.output.writableEnded, true);
});

for (const event of ["cancel", "EOF", "shutdown", "bad reply"])
  test(`${event} aborts pending capabilities and suppresses late success`, async (t) => {
    let signal;
    const host = fakeHost(async (_params, context) => {
      signal = context.signal;
      try {
        await context.capability({
          kind: "app-control",
          ruleId: "search",
          command: { action: "pause" },
        });
      } catch {}
      return success;
    });
    t.after(host.close);
    await host.send(init);
    await host.send(invocation);
    if (event === "EOF") host.input.end();
    else if (event === "bad reply")
      await host.send(
        reply("cap-1", { ...http({}), headers: { authorization: SENTINEL } }),
      );
    else
      await host.send({
        jsonrpc: "2.0",
        method: event,
        params: event === "cancel" ? { id: "invoke" } : {},
      });
    await nextTurn();
    assert.equal(signal.aborted, true);
    assert.equal(
      host.messages.some((m) => m.result?.status === "success"),
      false,
    );
    assert.equal(JSON.stringify(host.messages).includes(SENTINEL), false);
  });

test("uncaught worker exceptions never reach protocol or stderr", async (t) => {
  const host = fakeHost(() => {
    throw new Error(SENTINEL);
  });
  t.after(host.close);
  await host.send(init);
  await host.send(invocation);
  assert.deepEqual(host.messages.at(-1).result, {
    status: "error",
    code: "provider_error",
  });
  const child = spawn(
    process.execPath,
    [new URL("../src/worker.mjs", import.meta.url).pathname],
    { stdio: ["pipe", "pipe", "pipe"] },
  );
  let stderr = "";
  child.stderr.on("data", (b) => {
    stderr += b;
  });
  child.stdin.end(`{"secret":"${SENTINEL}"}\n`);
  await new Promise((resolve) => child.on("exit", resolve));
  assert.equal(stderr, "");
});

for (const malformed of [
  { kind: "text", text: "ok", attribution: 123 },
  {
    kind: "list",
    title: "Results",
    items: [{ label: "Song", detail: { unexpected: true } }],
  },
  {
    kind: "list",
    title: "Results",
    items: [{ label: "Song", url: "file:///private/data" }],
  },
])
  test(
    "rejects malformed private presentation " + JSON.stringify(malformed),
    () => {
      assert.equal(
        validReply({
          ok: true,
          kind: "app-control",
          status: "success",
          result: malformed,
        }),
        false,
      );
    },
  );
