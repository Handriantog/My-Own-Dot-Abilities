const messages = Object.freeze({
  permission_denied:
    "Spotify denied this request. Check the granted scopes, Premium status, developer-app access, and resource permissions.",
  setup_needed: "Connect Spotify in this Dot’s Ability settings.",
  host_unavailable: "The Ability host is unavailable.",
  unsupported_platform: "This platform is not supported.",
  timeout: "Spotify did not respond in time.",
  invalid_response: "Spotify returned an unusable response.",
  rate_limited: "Spotify’s request limit was reached. Try again later.",
  provider_error: "Spotify could not complete this request.",
  busy: "This Ability is busy.",
  cancelled: "The request was cancelled.",
});
export class SpotifyFailure extends Error {
  constructor(code, { uncertain = false, retrySeconds } = {}) {
    super("Spotify operation failed");
    this.code = Object.hasOwn(messages, code) ? code : "provider_error";
    this.uncertain = uncertain;
    this.retrySeconds =
      Number.isInteger(retrySeconds) && retrySeconds >= 0 && retrySeconds <= 30
        ? retrySeconds
        : undefined;
  }
}
export function mapSpotifyFailure(error) {
  const known =
    error instanceof SpotifyFailure
      ? error
      : new SpotifyFailure("provider_error");
  if (known.uncertain)
    return {
      status: "uncertain",
      owner: {
        kind: "text",
        text: "Spotify may have applied this action. Check Spotify before making a new request.",
        attribution: "Spotify",
      },
    };
  const text =
    known.code === "rate_limited" && known.retrySeconds !== undefined
      ? `Spotify’s request limit was reached. Try again in ${known.retrySeconds} seconds.`
      : messages[known.code];
  return {
    status: "error",
    code: known.code,
    owner: { kind: "text", text, attribution: "Spotify" },
  };
}
