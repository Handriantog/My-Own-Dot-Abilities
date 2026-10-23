import { setTimeout as sleep } from "node:timers/promises";
import manifest from "../ability.json" with { type: "json" };
import { SpotifyFailure } from "./errors.mjs";
import { bounded, validReply } from "./protocol.mjs";
const rules = new Map(
  manifest.permissions.filter((p) => p.kind === "https").map((p) => [p.id, p]),
);
function containsCredentials(value) {
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(
    ([key, child]) =>
      /^(access_token|refresh_token|client_secret|authorization)$/i.test(key) ||
      containsCredentials(child),
  );
}
export function createSpotifyClient({
  capability,
  signal,
  deadline = Date.now() + 55000,
  now = Date.now,
  delay = (ms) => sleep(ms, undefined, { signal }),
}) {
  return {
    async request(ruleId, values = {}) {
      const rule = rules.get(ruleId);
      if (
        !rule ||
        !values ||
        Array.isArray(values) ||
        typeof values !== "object" ||
        Object.keys(values).some(
          (key) => !["query", "pathValues", "body"].includes(key),
        )
      )
        throw new SpotifyFailure("permission_denied");
      const mutation = rule.method !== "GET";
      const request = {
        kind: "https",
        ruleId,
        pathValues: {},
        query: {},
        ...values,
      };
      for (let attempt = 0; attempt < 2; attempt++) {
        if (signal?.aborted) throw new SpotifyFailure("cancelled");
        if (now() >= deadline) throw new SpotifyFailure("timeout");
        let response;
        try {
          response = await capability(request);
        } catch {
          throw new SpotifyFailure(
            signal?.aborted ? "cancelled" : "provider_error",
            { uncertain: mutation },
          );
        }
        if (signal?.aborted)
          throw new SpotifyFailure("cancelled", { uncertain: mutation });
        if (!validReply(response))
          throw new SpotifyFailure("invalid_response", { uncertain: mutation });
        if (!response.ok)
          throw new SpotifyFailure(response.code, {
            uncertain:
              mutation &&
              [
                "timeout",
                "host_unavailable",
                "invalid_response",
                "provider_error",
                "cancelled",
              ].includes(response.code),
          });
        const { status, headers, body } = response;
        if (status === 429) {
          const seconds = /^\d{1,2}$/.test(headers.retryAfter ?? "")
            ? Number(headers.retryAfter)
            : undefined;
          if (
            attempt === 0 &&
            seconds !== undefined &&
            seconds <= 30 &&
            now() + seconds * 1000 + 1000 < deadline
          ) {
            try {
              await delay(seconds * 1000);
            } catch {
              throw new SpotifyFailure("cancelled");
            }
            continue;
          }
          throw new SpotifyFailure("rate_limited", { retrySeconds: seconds });
        }
        if (status === 401) throw new SpotifyFailure("setup_needed");
        if (status === 403) throw new SpotifyFailure("permission_denied");
        if (status < 200 || status >= 300)
          throw new SpotifyFailure("provider_error", {
            uncertain: mutation && status >= 500,
          });
        if (body.length === 0) return { status, body: null };
        if (!/^application\/json(?:\s*;|$)/i.test(headers.contentType ?? ""))
          throw new SpotifyFailure("invalid_response", { uncertain: mutation });
        let parsed;
        try {
          parsed = JSON.parse(body);
        } catch {
          throw new SpotifyFailure("invalid_response", { uncertain: mutation });
        }
        if (
          !parsed ||
          Array.isArray(parsed) ||
          typeof parsed !== "object" ||
          !bounded(parsed) ||
          containsCredentials(parsed)
        )
          throw new SpotifyFailure("invalid_response", { uncertain: mutation });
        return { status, body: parsed };
      }
      throw new SpotifyFailure("rate_limited");
    },
  };
}
