# Verification

October 23, 2026 — development branch, no public release.

The dependency-free worker has 31 passing command, protocol and packaging tests.
They cover strict inputs, URI normalization, separate playback/UI grants, private
song/destination choices, fragmented UTF-8, cancellation, malformed replies,
duplicate delivery, no automatic mutation retry, deterministic archives and
rejection of altered platforms, symlinks and embedded credentials. The separate
Web API worker's 95 tests also pass. CI uses synthetic data and no real account.

Host acceptance installs the real archive in the production sealed installer and
runs its confined worker through the desktop/backend bridges with a synthetic
app-control transport. It verifies voice admission, no other Dot inheriting tools,
private metadata/selection isolation, exact selected track/destination forwarding,
one-use choices, uncertain delivery and cancellation on Disable. Host native tests
compile the actual Objective-C helper and check event encoding, argument rejection
and AX text decoding without accessing an app. UI fixtures cover ambiguity,
privacy confirmation, stale views/handles and changed current tracks.

With explicit owner authorization, a disposable Electron test app ran the
production transport and compiled helper against the signed-in Spotify app on
macOS 26 Apple Silicon. Verified: changing a search query, track results, visible
playlist listing, playing a supplied track, pausing, saving the current track,
creating a private playlist, and adding the exact selected track. The test caught
and fixed missing AX toast text and a replaced destination-menu handle. The test
song was removed from Liked Songs afterward. One private “Dot Ability Test”
playlist with the selected song remains for owner inspection; Spotify is paused.

The owner authorized temporary Accessibility and Spotify Automation permissions
for the isolated test app and completed macOS authentication. Both grants were
revoked afterward and the test app was quit. Re-signing the ad-hoc harness required
replacing its stale Accessibility entry. Automatic permission prompting and the
final My Own Dots package's live UI are not established by this check.

Chrome visual checks used the actual permission/result components and synthetic
bridge at 760px and 360px. Local source and storage paths wrap; the local review
and Teach transition are operable. This is distinct from a real native file-picker
installation into the owner's workspace.

Not live-verified: skip/previous, volume, seek, shuffle/repeat, album or playlist
playback, playlist search, every account tier/layout, microphone-to-Spotify voice
interaction, and older/non-arm64 platforms. UI automation currently requires
English and loaded/visible rows. OS access is broader than the host's Spotify-only
command contract. The separate Web API package remains text-only; local technical
voice admission does not establish provider terms compliance.


## Host follow-up — October 24, 2026

Subsequent host work supersedes the initial pending playlist-search/playback and
volume items above. In the final development app, a private playlist search
reached selection and playback; owner pause/resume requests succeeded and native
inspection confirmed the Bus playlist playing. An isolated live volume diagnostic
reproduced a Spotify rounding mismatch, then confirmed restoration twice at
48 → 11 → 48 after the host fix. This is native transport evidence, not a completed
microphone-call acceptance test.

[Host PR #12](https://github.com/Handriantog/My-Own-Dots/pull/12), commit
`c07f4eef60e7a272489b99c9b124f53f9c480471`, has passing push and PR Linux/macOS
checks, including packaging and relocated signed-app smoke. Its local suite
passes 2,191 tests with one existing signing-identity skip; macOS Ability
acceptance passes 431 tests and 28 native sandbox probes. Chrome checked the new
list/detail browser at 1,120px/360px in both themes. Native inspection confirmed
the installed package README and GitHub documentation. The existing Accessibility
grant was refreshed for the rebuilt app and its health reports access available.
These host changes do not add worker dependencies or change this package's
permissions. See the host's
[verification record](https://github.com/Handriantog/My-Own-Dots/blob/c07f4eef60e7a272489b99c9b124f53f9c480471/docs/desktop/abilities-verification.md)
for exact coverage and remaining limits. Real microphone-to-Spotify acceptance,
other playback controls, unsupported locales/platforms and Web API account
verification remain separate; no public Ability release has been published.

## Icon metadata update — development 0.1.1

The package and catalog now share safe vector icon metadata. The icon-aware
public host manifest schema is pinned to host commit
`9024a2e4efa644ac97533c91a663b8a335d65a4b` (API 1). Earlier strict hosts reject
this added field. Worker code, permissions and account behavior are unchanged.
This metadata change adds no live account verification or public release claim.
