# Local development setup

The updated `feat/abilities` host and Spotify desktop app are required. Open
Spotify and sign in yourself. In Dot settings → Abilities, choose **Choose local
Ability…**, select the generated JSON descriptor beside its matching `.tar.gz`,
review the local source and permissions, then choose **Teach**. The chooser reads
and hashes a snapshot; it executes nothing before Teach. Local archives are
limited to 16 MiB and review expires after ten minutes.

On the first playback request macOS may ask to let My Own Dots control Spotify.
Approve it to use playback; manage it in System Settings → Privacy & Security →
Automation. UI operations will also need Accessibility for My Own Dots. These
macOS grants are separate from per-Dot Ability consent. Never disable macOS
protections to make the Ability work. Missing access produces a blocked result.

Source development launches can have different macOS permission attribution than
the packaged app. Ad-hoc re-signing can invalidate prior grants; select the current
app in System Settings. The isolated desktop test app was verified with manual
Accessibility and Automation grants; an automatic first-run prompt is not assumed.

Keep Spotify in English and avoid changing its view while a command runs.
Playlist listing covers loaded/visible rows, not the entire account. Adding a song
uses a private exact-recording choice and an exact playlist name; duplicate names
are rejected. Creation starts with Spotify's empty default-named playlist at its
default visibility, then makes it private. Interrupted creation can leave the
empty playlist behind. Inspect uncertain results in Spotify before retrying;
mutations are never retried automatically.

All Dots control the same signed-in desktop account and player. Disabling an
Ability cancels owned work, and quitting Dot stops its helpers. Neither operation
quits Spotify or undoes an already completed account change.

Voice commands are admitted by the local host contract. This technical behavior
does not establish compliance with Spotify's terms. Distribution and policy
applicability need review; this project makes no claim of Spotify approval.
