# Spotify Ability

Teach a selected Dot to search Spotify, control your player, create private
playlists, and save songs to Liked Songs. Spotify plays the audio.

**Source implementation, unreleased.** The dependency-free worker implements
11 tools against Dot Ability API 1. Automated tests use synthetic provider data.
No live account verification or public installable release is claimed.
The first version targets typed commands on macOS 26 Apple Silicon. Spotify's
[Developer Policy](https://developer.spotify.com/policy) prohibits third-party
voice control; host enforcement and integration acceptance are release gates.

Follow [SETUP.md](SETUP.md) for your personal Spotify Developer app. Read
[permissions](ability.json), [privacy](PRIVACY.md), [terms](TERMS.md), and
[verification status](VERIFICATION.md) before use.

## What it does

- Search tracks, artists, albums and playlists; display results directly.
- Play/resume, pause, skip, queue a track and change supported device volume.
- List playlists, create private playlists, add tracks and save Liked Songs.

It uses the active player unless you explicitly choose another available device.
Ambiguous songs, playlists or devices produce private choices on screen. Spotify
metadata never enters the AI tool result. Approved actions need no repeated
permission prompt. Quitting Dot stops Ability workers; Spotify can keep playing.
Saving a song does not download audio. Public playlist writes are not included.

## Development

Node 24+ and Python 3.11+; no npm installation is needed. From the repository root:

```sh
node --test abilities/spotify/test/*.test.mjs
python3 abilities/spotify/scripts/check_manifest.py
python3 scripts/check_repository.py
git diff --check
python3 abilities/spotify/scripts/package.py --development --output dist/spotify-check
```

Packaging uses an explicit source/document allowlist, deterministic tar/gzip,
MIT license and a per-file inventory. Output directories must not contain the
same artifacts already. Tests/caches/environment files are excluded. A basic
credential-pattern check is a guard against accidents, not a secret audit.

Development descriptors use a `spotify/development-<commit>` tag and an offline
placeholder asset ID. They are for disposable acceptance fixtures, not release
installation. Release metadata requires clean committed source and the real
GitHub archive asset ID via `--asset-id`; packaging never uploads or publishes.
The maintainer must create the final descriptor against that exact uploaded
archive, verify its digest/size/source, and separately authorize publication.
`catalog.json` remains unreleased until that happens.

The worker imports only its own source and manifest. Host enforcement and shared
interfaces belong in [My Own Dots](https://github.com/Handriantog/My-Own-Dots).
For an owner selection continuing an ambiguous command, reuse the same tool and
arguments with its opaque selection reference. The host verifies reference
ownership, expiry and account/consent binding before passing private data.

Original source is [MIT](LICENSE). No third-party runtime code or audio is bundled.
This independent project is not sponsored or endorsed by Spotify.
