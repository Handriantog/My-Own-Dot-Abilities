# Spotify Ability verification

Updated October 23, 2026. Source implementation and synthetic checks only.

- Host contract: API 1, pinned in `test/host-contract/contract-lock.json` with
  exact schema/transcript digests. Host enforcement belongs to My Own Dots.
- Worker and packaging: 95 tests cover all eleven tools, local ambiguity,
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

Nine real-host integration scenarios pass using the sealed archive and production
bundled host: per-Dot consent, required notice agreement, mock browser PKCE,
host-encrypted credentials, all eleven tools, private choices, exact HTTP routes,
401 refresh/revocation, expired selections, disable/re-enable/disconnect, unknown
mutation duplicate prevention after service restart, desktop/backend disconnect,
and preservation of a separate playback stand-in process. Actual model prompts,
durable events, memory/compaction inputs, diagnostics and speech inputs contain
no sentinel provider metadata or fake credentials, including provider rejection
and partial-success paths. Spotify tools are absent from direct/delegated voice.

Host-generic tests separately cover real desktop crashes/freeze, native process
reaping, changed permissions, restore-disabled bindings and interrupted durable
receipts. These are platform invariants, not extra live Spotify claims.

Final local host checks pass: 233 files / 1,966 tests (one existing certificate
identity skip); native acceptance 14 checks in each of two profiles and 242
integration tests; format/lint/types/build; speech 31 + 17; desktop package and
relocated actual-app smoke for JavaScript, Python and native workers. The sealed
Spotify integration artifact comes from `dcf2de644e1b78d24d4768f0a18619dcbfad37cf`,
SHA-256 `45d5d09308a0276d2fc110f9daa976fa2bd22303c44b153dbe3486c536e38428`,
and is committed in the host test fixtures. macOS 26.6.2 arm64, Node 24.20.0,
Python.org 3.14.3 and Electron 44.8.0 / embedded Node 24.22.0 were exercised.
Independent review found three uncertainty-reporting defects across the host
and worker; the fix pass adds crash, cancellation, receipt-write and partial
playlist regressions. Final reruns and latest-commit push/PR CI are pending. Native visual/keyboard inspection is unavailable because
Computer Use has not been approved for Safari. No real Spotify account, token,
playlist or playback action has been used.

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
