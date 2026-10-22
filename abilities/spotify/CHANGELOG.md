# Changelog

## Unreleased — 0.1.0 source

- Add eleven owner-only search, playback, private-playlist and library tools.
- Declare six OAuth scopes and sixteen constrained host HTTP routes.
- Use local matching, private choices and generic model-facing outcomes.
- Bound transport, cancellation and retries; preserve uncertain/partial actions.
- Package a sealed dependency-free worker with setup/privacy/provider notices.
- Target typed commands; Spotify voice control is excluded by provider policy.

No public package or live account verification has been released.

- Preserve generic uncertainty after playlist creation if additions fail, while
  retaining the created-playlist link only in the private owner card.
