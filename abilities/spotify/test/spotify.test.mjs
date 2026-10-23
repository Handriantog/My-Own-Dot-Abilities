import test from "node:test";
import assert from "node:assert/strict";
import { createSpotifyClient } from "../src/spotify.mjs";
import { mapSpotifyFailure } from "../src/errors.mjs";
import { broker, http, SENTINEL } from "./fixtures.mjs";

const values = { query: { q: "synthetic song", type: "track", limit: 5 } };
test("broker receives only named rules and structured values, never a URL or token", async () => {
  const fake = broker([http({ tracks: { items: [] } })]);
  const client = createSpotifyClient(fake);
  assert.deepEqual(await client.request("search", values), {
    status: 200,
    body: { tracks: { items: [] } },
  });
  assert.deepEqual(fake.requests, [
    { kind: "https", ruleId: "search", pathValues: {}, ...values },
  ]);
  await assert.rejects(client.request("https://evil.example", {}));
  await assert.rejects(
    client.request("search", { ...values, token: SENTINEL }),
  );
  assert.equal(fake.requests.length, 1);
});

for (const status of [200, 204])
  test(`empty ${status} is an acknowledgment, not malformed JSON`, async () => {
    const client = createSpotifyClient(broker([http("", status, {})]));
    assert.deepEqual(await client.request("playback"), { status, body: null });
  });

for (const response of [
  http("{", 200),
  http("null", 200),
  http("{}", 200, { contentType: "text/html" }),
  http({ access_token: SENTINEL }),
  http("x".repeat(1048577)),
])
  test("invalid, truncated, non-object or credential-bearing JSON fails closed", async () => {
    const client = createSpotifyClient(broker([response]));
    await assert.rejects(client.request("search", values), (error) => {
      assert.equal(mapSpotifyFailure(error).code, "invalid_response");
      assert.equal(
        JSON.stringify(mapSpotifyFailure(error)).includes(SENTINEL),
        false,
      );
      return true;
    });
  });

for (const [status, code] of [
  [401, "setup_needed"],
  [403, "permission_denied"],
  [404, "provider_error"],
  [429, "rate_limited"],
  [503, "provider_error"],
])
  test(`${status} maps to fixed owner-safe failure`, async () => {
    const client = createSpotifyClient(
      broker([http({ error: { message: SENTINEL } }, status)]),
    );
    await assert.rejects(client.request("search", values), (error) => {
      const outcome = mapSpotifyFailure(error);
      assert.equal(outcome.code, code);
      assert.equal(JSON.stringify(outcome).includes(SENTINEL), false);
      return true;
    });
  });

for (const response of [
  http({}, 503),
  { ok: false, code: "timeout" },
  { ok: false, code: "invalid_response" },
  new Error(SENTINEL),
])
  test("mutations with uncertain delivery are never retried", async () => {
    const fake = broker([response, http("", 204)]);
    const client = createSpotifyClient(fake);
    await assert.rejects(
      client.request("next", { query: { device_id: "device" } }),
      (error) => mapSpotifyFailure(error).status === "uncertain",
    );
    assert.equal(fake.requests.length, 1);
  });

test("bounded Retry-After is honored once, only within the remaining deadline", async () => {
  const fake = broker([http({}, 429, { retryAfter: "2" }), http({})]);
  const waits = [];
  const client = createSpotifyClient({
    ...fake,
    now: () => 0,
    deadline: 5000,
    delay: async (ms) => waits.push(ms),
  });
  await client.request("search", values);
  assert.deepEqual(waits, [2000]);
  assert.equal(fake.requests.length, 2);
  for (const retryAfter of ["99999", "garbage", "2"]) {
    const limited = broker([http({}, 429, { retryAfter })]);
    await assert.rejects(
      createSpotifyClient({ ...limited, now: () => 0, deadline: 1000 }).request(
        "search",
        values,
      ),
      (error) => mapSpotifyFailure(error).code === "rate_limited",
    );
    assert.equal(limited.requests.length, 1);
  }
});

test("abort prevents provider requests and stops a rate-limit wait", async () => {
  const controller = new AbortController();
  controller.abort();
  const fake = broker([http({})]);
  await assert.rejects(
    createSpotifyClient({ ...fake, signal: controller.signal }).request(
      "search",
      values,
    ),
    (error) => mapSpotifyFailure(error).code === "cancelled",
  );
  assert.equal(fake.requests.length, 0);
  const waiting = new AbortController();
  const pending = createSpotifyClient({
    ...broker([http({}, 429, { retryAfter: "10" })]),
    signal: waiting.signal,
  }).request("search", values);
  setImmediate(() => waiting.abort());
  await assert.rejects(
    pending,
    (error) => mapSpotifyFailure(error).code === "cancelled",
  );
});
