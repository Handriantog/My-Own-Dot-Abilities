# Spotify Ability

Teach a Dot to control your Spotify listening and manage playlists.

**Status: planned.** This directory contains the initial scope, not executable
code or an installable release. Host Ability support and the Spotify implementation
are still to be built and verified.

## Initial scope

- Search songs, artists, albums, and playlists.
- Play, pause, resume, skip, and inspect the current track/playback device.
- Queue songs and adjust volume.
- Create playlists and add songs.
- Save songs to Liked Songs; saving does not download audio.
- Make these actions available through the selected Dot's chat and voice tools.

Proposed defaults are private playlists and the user's active Spotify device,
with a device selector when needed. Spotify handles audio playback. Quitting Dot
stops Ability workers and monitoring without closing Spotify or stopping music.

## Access and setup

The Ability will request access to the selected Spotify account's playback,
playlists, and saved songs, plus the necessary Spotify network endpoints. It does
not need general folder access, desktop capture, or shell execution for this API
integration. Final permission declarations depend on the host package contract.

Use browser authorization with PKCE and host-managed credentials. Do not put
Spotify passwords, client secrets, or tokens in the package. A personal developer
app configuration is the proposed initial distribution path; shared-app access
is subject to Spotify's limits.

As checked on October 23, 2026, API playback requires Premium. Development apps
require their owner to have Premium and allow up to five authenticated,
allowlisted users. Endpoint availability and quotas must be rechecked before
implementation and release.

- [Playback API](https://developer.spotify.com/documentation/web-api/reference/start-a-users-playback)
- [Quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes)
- [PKCE authentication](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow)
- [Current API guidance](https://developer.spotify.com/documentation/web-api/tutorials/building-with-ai)

## Verification

No live account or playback verification has been performed. Future automated
tests should use fixtures for discovery, permissions, token expiry, rate limits,
missing devices, and ambiguous mutation results. Real playlist/library changes
and playback tests require explicit account-owner authorization.

Original code will use the repository's [MIT license](../../LICENSE). Any bundled
dependencies retain their own notices. This project is not affiliated with Spotify.
