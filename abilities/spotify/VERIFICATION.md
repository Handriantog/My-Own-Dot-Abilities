# Spotify Ability verification

Updated October 23, 2026. Source implementation and synthetic checks only.

- Host contract: API 1, pinned in `test/host-contract/contract-lock.json` with
  exact schema/transcript digests. Host enforcement belongs to My Own Dots.
- Worker and packaging: 92 tests cover all eleven tools, local ambiguity,
  per-command device IDs, private playlists, partial/uncertain mutations,
  bounded protocol, cancellation, duplicate delivery and redacted failures.
- Dependencies: no third-party runtime/build packages; Node and Python standard
  libraries only. No npm/pip installation or postinstall hooks.
- CI uses the same GitHub-maintained `actions/setup-node` v4.4.0 revision
  `49933ea5288caeca8642d1e84afbd3f7d6820020`, Node 24.20.0, already reviewed for
  the host's macOS job: upstream action/package/build dependencies and security
  notices checked. Its committed bundled JavaScript was not reproduced locally.
  The workflow fetches the exact public event revision, requests no repository
  token permissions and has no release/upload/account step.
- Provider references rechecked: [playback](https://developer.spotify.com/documentation/web-api/reference/start-a-users-playback),
  [devices](https://developer.spotify.com/documentation/web-api/reference/get-a-users-available-devices),
  [queue](https://developer.spotify.com/documentation/web-api/reference/add-to-queue),
  [playlist creation](https://developer.spotify.com/documentation/web-api/reference/create-playlist),
  [playlist items](https://developer.spotify.com/documentation/web-api/reference/add-items-to-playlist),
  [library](https://developer.spotify.com/documentation/web-api/reference/save-library-items),
  [2026 changes](https://developer.spotify.com/documentation/web-api/references/changes/february-2026),
  [policy](https://developer.spotify.com/policy), redirect/quota links in SETUP.

## Remaining gates

Deterministic packaging, license/inventory checks, source cleanliness, symlink
and credential guards pass. The actual packaged host accepted and sealed the
20-file development artifact through its production installer; only offline
GitHub metadata/download transport was supplied by the check.

Real-host execution acceptance, typed-only enforcement in the host, the
host's confirmed-401 refresh behavior, pre-install terms/privacy presentation and
acceptance, final independent review, latest-commit
push/PR CI, native UI inspection and live account checks remain pending here.
No real Spotify account, token, playlist or playback action has been used.

Before publication, verify provider eligibility, distribution terms and branding
against the actual UI. Current owner cards show text attribution and canonical
Spotify item links; this is not a claim that visual brand review is complete.
A signed/notarized Dot release and a published sealed Ability are separate gates.

## Live acceptance when separately authorized

Connect the owner's personal app, verify search and current devices, and agree
on a test track, player and temporary private playlist. Record play/pause/resume,
skip/queue/volume support, private creation/addition and saving the agreed track.
Verify disconnect/reconnect and inspect Spotify after cancellation. Never capture
credentials in screenshots, fixtures, logs or reports. Dispose of test account
changes only as the owner authorizes.

For the production host package check (supply the built host distribution):

```sh
node abilities/spotify/scripts/verify_host.mjs --bundle /path/to/dot/dist/desktop --artifact dist/spotify-check/spotify-0.1.0.dot-ability.tar.gz --descriptor dist/spotify-check/spotify-0.1.0.json
```
