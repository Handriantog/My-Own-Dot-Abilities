# Spotify Local

An independent Ability for the Spotify desktop app on macOS Apple Silicon.
It uses the account already signed in to Spotify; no developer app, client ID,
OAuth connection, password, or Web API requests are needed.

**Implemented on the development branch; no release published.** The worker uses
Dot's Spotify-only app-control broker. The host owns native playback and scoped
Accessibility workflows; this package cannot supply arbitrary scripts or access
other apps. See [verification](VERIFICATION.md) for live coverage and limits.

Playback includes play, pause, next, previous, volume, seek, shuffle, repeat, and
playing a supplied track/album/playlist URI or canonical link. UI commands search
tracks/playlists, show visible library playlists, save the current song, create a
private playlist, and add a privately selected recording to a playlist. Private
owner cards keep provider metadata out of model-facing tool results.

See [setup](SETUP.md). This package is independent of the Spotify Web API Ability.
Both text and voice are technically admitted; this is not a claim of Spotify
approval or exemption from its terms.

```sh
python3 abilities/spotify-local/scripts/check_manifest.py
node --test abilities/spotify-local/test/*.test.mjs
python3 abilities/spotify-local/scripts/package.py --development --output dist/spotify-local
```

The worker has no dependencies or install scripts. Its package contains only its
own allowlisted files and inventory. Development packages record their source
commit and dirty state; release packaging requires clean committed source and
the actual GitHub asset ID. The packager never publishes anything.

Version 0.1.1 adds vector icon metadata. Use the current My Own Dots desktop
with icon-aware API 1 manifests (host contract commit
`9024a2e4efa644ac97533c91a663b8a335d65a4b` or later). Earlier strict API 1 hosts
reject this optional field. No public release is available; account behavior and
permissions are unchanged.
