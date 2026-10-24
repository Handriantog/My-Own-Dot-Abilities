import test from "node:test";
import assert from "node:assert/strict";
import { dispatchTool } from "../src/commands.mjs";
import { fakeHost, init, invocation, reply } from "./fake-host.mjs";

for (const [tool, status, text] of [
  ["start", "approaching", "Mouse Mover is approaching the pointer."],
  ["start", "running", "Mouse Mover is running."],
  ["status", "paused", "Mouse Mover is paused while you use the mouse. It resumes after five seconds of inactivity."],
  ["status", "inactive", "Mouse Mover is stopped."],
  ["stop", "inactive", "Mouse Mover is stopped."],
]) test(`${tool} requests the declared activity and reports ${status}`, async (t) => {
  const host = fakeHost(dispatchTool);
  t.after(host.close);
  await host.send(init);
  assert.equal(host.messages.length, 1); // installation/initialization cannot start movement
  await host.send({ ...invocation, params: { tool, arguments: {}, settings: {} } });
  assert.deepEqual(host.messages[1].params, {
    kind: "companion-activity", ruleId: "movement",
    command: { action: tool, activityId: "carry-pointer" },
  });
  await host.send(reply(host.messages[1].id, { ok: true, kind: "companion-activity", status }));
  assert.deepEqual(host.messages.at(-1).result, {
    status: "success", owner: { kind: "text", text },
  });
  assert.equal(host.messages.filter((m) => m.method === "capability").length, 1);
});

for (const params of [
  { tool: "enable", arguments: {}, settings: {} },
  { tool: "start", arguments: { force: true }, settings: {} },
  { tool: "start", arguments: {}, settings: { autoStart: true } },
  { tool: "start", arguments: {}, settings: {}, selection: { action: "start" } },
]) test("invalid requests cannot acquire pointer authority " + JSON.stringify(params), async () => {
  const result = await dispatchTool(params, {
    signal: new AbortController().signal,
    capability: () => assert.fail("no capability for invalid input"),
  });
  assert.deepEqual(result, { status: "error", code: "permission_denied" });
});

test("cancellation before dispatch never acquires authority", async () => {
  assert.deepEqual(await dispatchTool(invocation.params, {
    signal: AbortSignal.abort(),
    capability: () => assert.fail("no capability after cancellation"),
  }), { status: "error", code: "cancelled" });
});

test("host refusal is reported without retrying or disclosing input", async (t) => {
  const host = fakeHost(dispatchTool); t.after(host.close);
  await host.send(init); await host.send(invocation);
  await host.send(reply("cap-1", { ok: false, code: "permission_denied" }));
  assert.deepEqual(host.messages.at(-1).result, { status: "error", code: "permission_denied" });
  assert.equal(host.messages.filter((m) => m.method === "capability").length, 1);
});

test("lost host or malformed reply never claims successful activation", async () => {
  for (const capability of [async () => { throw new Error("PRIVATE"); },
    async () => ({ ok: true, kind: "app-control", status: "success" }),
    async () => ({ ok: false, code: "PRIVATE" }),
  ]) assert.deepEqual(await dispatchTool(invocation.params, {
    signal: new AbortController().signal, capability,
  }), { status: "uncertain" });
});


test("repeated stop stays inactive with shared host state", async () => {
  let status = "running";
  const transitions = [];
  const host = {
    signal: new AbortController().signal,
    capability: async (request) => {
      assert.deepEqual(request, { kind: "companion-activity", ruleId: "movement", command: { action: "stop", activityId: "carry-pointer" } });
      transitions.push(status);
      status = "inactive";
      return { ok: true, kind: "companion-activity", status };
    },
  };
  for (let call = 0; call < 2; call++) {
    const result = await dispatchTool({ tool: "stop", arguments: {}, settings: {} }, host);
    assert.deepEqual(result, { status: "success", owner: { kind: "text", text: "Mouse Mover is stopped." } });
  }
  assert.deepEqual(transitions, ["running", "inactive"]);
});
