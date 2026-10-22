# Spotify Ability design

> October 23 implementation amendment: Spotify Developer Policy III.3 prohibits
> third-party voice control. Spotify tools are typed-only; acceptance must prove
> absence/denial in direct and delegated voice, while generic Ability voice
> support remains. Developer Terms V.11–12 also require exact pre-install
> privacy/terms display and explicit agreement. The host now supplies optional
> tool channels and digest-bound notices. These amendments supersede voice
> enablement and missing notice requirements below. See the execution ledger.

Status: approved by the owner on October 23, 2026; depends on the unimplemented Dot Ability
platform described in My-Own-Dots, `docs/desktop/abilities-design.md`.

## Intended outcome

Teach a selected Dot to search Spotify, control the user's existing player,
create playlists, add songs, and save tracks to Liked Songs through chat or voice.
Saving does not mean downloading audio. The owner has Spotify Premium and chose
a personal Spotify Developer app setup guide, rather than a shared public app.
Approved capabilities run without repeated confirmation prompts.

Keep Spotify-specific tool logic, permission declarations, tests, and release
assets under `abilities/spotify/`. The Dot host owns generic installation,
permissions, OAuth, credentials, and supervised execution. No Spotify tool
implementation is embedded in the host, and this package never imports host
private modules or another Ability's source.

## Implementation approach

Use a small JavaScript worker with no required third-party runtime dependencies,
speaking the host's versioned stdio protocol. The worker validates tool inputs,
maps them to Spotify operations through the host HTTP broker, and returns compact
owner-only structured results. It has no direct sockets, token access, or filesystem access
outside private state. TypeScript may be used for authoring if the build emits
plain JavaScript; no runtime compilation or installation scripts.

Direct Spotify Web API control fits the first version: it controls an existing
desktop/mobile/web Spotify device and uses explicit scopes. AppleScript or UI
automation is less portable and would request unrelated OS permissions. Embedded
streaming adds a separate player, lifecycle, and provider requirements; it is not
needed for this first Ability.

Spotify's [developer policy](https://developer.spotify.com/policy) prohibits
ingesting Spotify Content into AI models, in addition to prohibiting model
training. The proposed boundary is conservative: Spotify responses go to a
deterministic local resolver and the owner's UI, never to an LLM or AI speech
model. The model interprets the user's request and receives generic host-defined
action status and opaque host references. This changes how search results and
currently-playing details appear: display them directly rather than asking the
model to summarize or narrate them. Do not claim Spotify has approved this design.

## Personal developer-app setup

The shipped guide takes the user through these steps:

1. Open the Spotify Developer Dashboard and create a personal Web API application.
2. Register `http://127.0.0.1/abilities/oauth/callback` as the loopback redirect URI.
   The host binds an available loopback port and uses it in the authorization and
   token requests. Spotify permits dynamic ports for registered loopback IP
   literals; `localhost` is not valid. Show a copyable exact registration value.
3. Add the intended Spotify account to the application's allowed users when the
   dashboard requires it. Development mode requires the app owner to have Premium
   and has a small user allowance; this is a personal setup, not a shared public
   client intended to bypass Spotify's access limits.
4. Copy only the public client ID into the selected Dot's Spotify settings. Never
   ask for a client secret, Spotify password, or a pasted access/refresh token.
5. Select **Connect Spotify**, review provider consent in the system browser, and
   return to Dot. The host checks state and PKCE and stores credentials securely.
6. Open Spotify and make a player available before asking Dot to play music.

The callback listener is host-owned, short-lived, and session/Dot bound. A cancelled,
expired, replayed, or mismatched callback cannot connect an account. Changing client
ID requires reconnecting. Separate Dots receive separate consent and credential
bindings even when the user chooses the same Spotify account.

Spotify's [PKCE guide](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow),
[redirect rules](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri),
and [quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes)
are the provider sources checked on October 23, 2026. Link to them in the guide
and recheck before release; do not hard-code obsolete developer-client quotas.

## Permissions and defaults

The review screen explains that this Ability can read playback/device information,
control playback, read the user's playlists, create/edit private playlists, and
save songs to their library. It also displays the literal Spotify API origins and
OAuth scopes. No home-folder, microphone, Accessibility, app-launch, shell,
background scheduling, or native-helper permission is requested. Voice input is
already provided by Dot, not captured by this Ability.

OAuth configuration uses `https://accounts.spotify.com/authorize` and
`https://accounts.spotify.com/api/token`. Credentialed resource requests go only
to approved routes under `https://api.spotify.com/v1`. Only the host accesses
the token endpoint. Request the initial scopes:

- `user-read-playback-state`
- `user-read-currently-playing`
- `user-modify-playback-state`
- `playlist-read-private`
- `playlist-modify-private`
- `user-library-modify`

Do not request email, profile editing, listening history, or public playlist write
access. Initial playlist creation explicitly sends `public: false`; Spotify's
API default must not decide this. Public playlist creation/editing needs an
explicit later permission expansion. The initial add-to-playlist operation only
targets private playlists writable under the granted scopes.

Use the active Spotify device unless the user names a different available device.
If none is active, return a concise instruction to open Spotify; do not silently
choose or start playback on an unrelated device. An explicit device selection
may transfer playback using the granted control scope. Do not retain device IDs
as permanently valid; refresh available devices when needed.

## Tool surface and API mappings

All input schemas reject unknown fields, invalid Spotify resource types, excessive
lists, out-of-range volume, and unrecognized playback actions. IDs and URIs are
validated and inserted as encoded values, never treated as arbitrary URLs.

| Tool              | Behavior                                                                                                | API operation under `/v1`                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `search`          | Search tracks, artists, albums, or playlists; default five results, max ten per type                    | `GET /search`                                                                                           |
| `playback`        | Current track/context, state, and available devices                                                     | `GET /me/player`, `GET /me/player/devices`; currently-playing route when needed                         |
| `play`            | Resolve a user-supplied query, use an owner-selected result, play user-supplied URIs/context, or resume | `GET /search` when resolving; `PUT /me/player/play`; explicit transfer via `PUT /me/player` when needed |
| `pause`           | Pause the active/selected device                                                                        | `PUT /me/player/pause`                                                                                  |
| `skip`            | Next or previous                                                                                        | `POST /me/player/next` or `/previous`                                                                   |
| `queue`           | Add a validated track to the playback queue                                                             | `POST /me/player/queue`                                                                                 |
| `volume`          | Set a supported device's volume, 0–100                                                                  | `PUT /me/player/volume`                                                                                 |
| `playlists`       | List the user's playlists with bounded pagination                                                       | `GET /me/playlists`                                                                                     |
| `create_playlist` | Create a private playlist, optionally followed by an explicit add-items step                            | `POST /me/playlists`                                                                                    |
| `add_to_playlist` | Add tracks to a chosen writable private playlist                                                        | `GET /playlists/{id}`, `POST /playlists/{id}/items`                                                     |
| `save_tracks`     | Save tracks to Liked Songs                                                                              | `PUT /me/library` with validated track URIs                                                             |

The declarative permission rules enumerate these methods and path templates,
validate query/body fields, and constrain private-playlist creation. They do not
grant every Spotify endpoint. Provider scopes and API authorization remain an
additional boundary; missing scopes or denied playlist access produce a failure.
Use current endpoints, including `/me/playlists`, playlist `/items`, and the
library URI endpoint. The [February 2026 changes](https://developer.spotify.com/documentation/web-api/references/changes/february-2026)
also reduce development-mode search limits. See the current
[create-playlist](https://developer.spotify.com/documentation/web-api/reference/create-playlist)
and [save-library-items](https://developer.spotify.com/documentation/web-api/reference/save-library-items)
references before implementing fixtures.

Search returns identifiers, titles, artists, item types, and Spotify links only
to the host's owner-only result channel. The model receives no Spotify metadata,
raw errors, URLs, device names, playlist names, or provider identifiers. Host-minted
opaque references permit later actions without disclosing the underlying content.
Treat all displayed text as untrusted and escape it; open only validated Spotify
links. Do not fetch audio, lyrics, previews, audio features, or recommendations.
User-facing results attribute Spotify and link to returned items.

Use session-only provider results, expiring after ten minutes or sooner on account
disconnect. Do not persist them into chat history, memory, summaries, embeddings,
logs, backups, or AI voice generation. Account disconnect clears cached personal
data as well as credentials. The [developer terms](https://developer.spotify.com/terms)
require limited retention and removal of personal data on disconnect. Include
provider attribution, a privacy notice, disconnect instructions, and applicable
end-user terms in the setup/release documentation; an MIT source license alone
does not address the provider's distribution requirements.

## Conversation behavior and failures

Use the same tools for typed and voice requests. A direct request can use already
approved permissions without another confirmation. For a named track/artist,
resolve an unambiguous normalized exact match locally; otherwise show a selection
list. The user can choose a displayed result or refer to its position in a later
request; resolve the choice against the current Dot's pending list, not a new
search. Playlist/device names are similarly matched locally. Do not ask the model
to choose among Spotify metadata. Generic voice acknowledgments can say that an
action completed or a selection is needed; Spotify-sourced details remain on
screen. Do not send those details through an AI text-to-speech model.
A voice cancellation revokes further broker operations but cannot reverse
an action Spotify already accepted. Playing audio is external Spotify behavior,
not a Dot-owned helper process; quitting Dot leaves Spotify and its music alone.

Handle these cases explicitly:

- `204` or an empty playback read: no current playback, not malformed JSON. Empty
  successful mutation responses are acknowledgments and must not be JSON-parsed.
- `401`: host refreshes once under a serialized account refresh; expired/revoked
  authorization leads to reconnect, without exposing tokens.
- `403`: explain available provider detail, such as missing scope, Premium, or
  developer allowlist access. Do not claim every `403` has the same cause.
- Missing/restricted device or unsupported volume control: explain the actionable
  limitation; do not claim the action happened.
- `429`: honor bounded `Retry-After`; return the retry time if it exceeds the call
  deadline. Never loop aggressively or rotate client IDs to avoid a quota.
- Network timeout or `5xx` on a mutation: preserve an unknown outcome when the
  server may have applied it. Do not retry playlist creation, additions, queue, or
  skip automatically after an uncertain result.
- Create succeeded but add-items failed: return the created playlist link and
  which tracks were not confirmed, rather than creating another playlist.
- Empty search, unavailable tracks, null playlist entries, missing device IDs,
  relinked tracks, and partial lists: handle without inventing provider fields.

Keep per-account request order for related mutations. Persist bounded operation
receipts containing invocation identity and generic status, without provider
content, so duplicate delivery does not silently replay an action. Keep any
playlist link or provider-specific partial result only in the expiring owner UI
channel. An interrupted, unresolved mutation remains uncertain on
restart and requires a fresh user request; the model cannot turn it into a retry
by resubmitting the same invocation identifier.

## Package, checks, and acceptance

Keep source, host-contract fixtures, protocol tests, API mapping tests, setup guide,
manifest, licenses, and package script inside `abilities/spotify/`. Produce one
sealed Ability artifact and release descriptor for `spotify/v0.1.0`, with source
commit, digest, compatible host API, and supported platforms. Do not publish the
release until both host and package are verified and publication is authorized.
Keep `catalog.json` unreleased until an actual release exists.

Automated tests use a fake host/provider and cover every tool's request shape,
input validation, scope/route bounds, empty responses, pagination, current 2026
endpoints, rate limits, refresh, duplicate delivery, partial success, and uncertain
mutations. Verify that sentinel Spotify metadata cannot reach model prompts,
conversation storage, logs, summaries, embeddings, or AI speech input, including
through error and cancellation paths. They contain no real account data or
credentials. Run package checks
plus the root `scripts/check_repository.py` and whitespace checks in CI.

Integration acceptance installs the sealed artifact into a disposable Dot workspace,
proves it only appears on the authorized Dot, and exercises chat/voice routing,
disconnect, disable, quit, and restart. It relies on the platform's separate
JavaScript/Python/native isolation tests rather than presenting this JavaScript
package as proof of native sandbox security.

Live acceptance, once the owner connects an account, separately verifies search,
available devices, play/pause/resume/skip, queue/volume where supported, a clearly
named private test playlist, and saving an agreed test track. Real account changes
need authorization for those test actions. Record exact outcomes; a passing mock
test does not establish that a provider account works. Keep tokens out of logs,
fixtures, screenshots, Git, and test reports.
