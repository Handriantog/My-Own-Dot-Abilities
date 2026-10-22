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
