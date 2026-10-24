import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const json = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url)));
test("requires explicit interactive text/voice tools and only the pointer/display grant", async () => {
  const m = await json("../ability.json");
  assert.deepEqual(m.tools.map(t => t.id).sort(), ["start", "status", "stop"]);
  for (const t of m.tools) {
    assert.equal(t.execution, "interactive");
    assert.deepEqual(t.channels, ["text", "voice"]);
    assert.deepEqual(t.input, { type: "object", properties: {}, required: [], additionalProperties: false });
    assert.deepEqual(t.output, { type: "null" });
    assert.equal(t.visibility, "owner-only");
  }
  assert.deepEqual(m.permissions, [{
    id: "movement", kind: "companion-activity",
    purpose: "Carry the pointer and keep the display awake until you stop Mouse Mover.",
    activities: ["carry-pointer"], pointer: true, keepAwake: "display",
  }]);
  assert.deepEqual(m.helpers, []);
  assert.equal(m.activities.length, 1);
  const a = m.activities[0];
  assert.equal(a.id, "carry-pointer");
  assert.deepEqual(a.pointer, { hand: "right", idleMs: 5000 });
  assert.equal(a.keepAwake, "display");
  assert.equal(a.loop, true);
  assert.ok(a.approachMs >= 1000 && a.durationMs >= 10000);
  assert.equal(a.keyframes.length, 2);
  assert.deepEqual(a.motion, {kind:"floor-walk",speed:66,descendMs:2400});
  assert.equal(a.approachMs,1600);
  assert.equal(a.durationMs,24000);
  assert.equal(a.keyframes[0].at, 0);
  assert.equal(a.keyframes.at(-1).at, 1);
  const { at: _first, ...first } = a.keyframes[0];
  const { at: _last, ...last } = a.keyframes.at(-1);
  assert.deepEqual(first, last);
  assert.ok(a.keyframes.every((f, i) => (!i || f.at > a.keyframes[i-1].at) && f.pose.rightArm < -0.8 && f.pose.rightArmLength >= 40));
  const p = await json("../package.json");
  assert.equal(p.version, m.version);
  for (const field of ["dependencies", "devDependencies", "optionalDependencies"]) assert.deepEqual(p[field] || {}, {});
});
