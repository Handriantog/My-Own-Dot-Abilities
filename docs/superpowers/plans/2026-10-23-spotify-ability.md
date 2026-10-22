# Spotify Ability Implementation Plan

> October 23 implementation amendment: Spotify Developer Policy III.3 prohibits
> third-party voice control. Spotify tools are typed-only; acceptance must prove
> absence/denial in direct and delegated voice, while generic Ability voice
> support remains. Developer Terms V.11–12 also require exact pre-install
> privacy/terms display and explicit agreement. The host now supplies optional
> tool channels and digest-bound notices. These amendments supersede voice
> enablement and missing notice requirements below. See the execution ledger.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a sealed Spotify Ability that a selected Dot can use for search, playback, private playlists, and saved songs through chat or voice.

**Architecture:** A dependency-free JavaScript worker implements Spotify-specific tools against the Dot Ability protocol. The desktop host performs OAuth, injects credentials, enforces HTTPS grants, and stores owner-only results. Spotify data never returns to the model; local matching and opaque selections support follow-up commands.

**Tech Stack:** Node 24+ JavaScript ES modules, `node:test`, Python 3.11+ standard-library packaging and repository validation. No npm runtime dependencies, Spotify SDK, runtime installer, or embedded player.

**Spec:** [Approved Spotify design](../specs/2026-10-23-spotify-ability-design.md). Host contract and acceptance dependency: My-Own-Dots `docs/desktop/abilities-implementation-plan.md`.

## Global Constraints

- Reuse `/Users/han/MyOwnStack/My-Own-Dot-Abilities/.worktrees/spotify`, branch `feat/spotify`. Implementation, tests, packaging, and guide remain under `abilities/spotify/`.
- Host runtime, permissions, OAuth, and credentials remain in My Own Dots. Do not import host private code or another Ability's source.
- A personal Spotify Developer app client ID is required; use browser authorization with PKCE. Never request a client secret, password, or pasted token.
- Approved capabilities run without repeated confirmation prompts. Permission expansion still requires review.
- Initial playlist creation explicitly sends `public: false`. No public-playlist write, email, history, microphone, Accessibility, shell, or native-helper grant.
- Request exactly `user-read-playback-state`, `user-read-currently-playing`, `user-modify-playback-state`, `playlist-read-private`, `playlist-modify-private`, and `user-library-modify`.
- User commands can be interpreted by the model; Spotify responses, identifiers, URLs, names, errors, and display details must remain owner-only. No AI narration of Spotify-sourced content.
- Use the active Spotify device unless the user names a different available device. No implicit playback transfer to another device.
- Use current `/me/playlists`, playlist `/items`, and `/me/library` endpoints. Search defaults to five results and allows at most ten per type.
- Provider result lifetime is ten minutes maximum and ends sooner on disconnect. No persistence into conversations, memory, summaries, logs, backups, embeddings, or AI voice input.
- Do not retry non-idempotent mutations after an uncertain outcome. A successful creation followed by failed additions is partial success, never a reason to create a duplicate playlist.
- No live accounts or secrets in CI. Runtime dependency additions require the repository's upstream/revision/advisory/scripts/binary review before execution.
- Keep main protected. Check locally, push, wait for push checks, then open PR and inspect current-commit PR checks. Do not publish a release or mutate a live account without authorization for that action.

## Review Focus

1. Several versions of a song with the same title/artist must yield a selection, not an arbitrary recording — Task 3.
2. Playback moving to another device between discovery and control must not silently target a different device — Task 4.
3. A successful remote mutation followed by connection loss or worker death must not be reported as failed-and-retried — Tasks 2, 4, 6.
4. A provider error containing track names, tokens, or raw JSON must not leak through generic status, logs, or voice delivery — Tasks 2, 6.
5. An old selection after account change, grant update, or expiry must not act on another account's item — Tasks 3, 6.

## File map and interface ownership

| Files under `abilities/spotify/`                                      | Responsibility                                                         |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `ability.json`, `package.json`                                        | Host manifest and local developer check commands                       |
| `src/{worker,protocol}.mjs`                                           | Stdio entrypoint, cancellation, host capability requests               |
| `src/{spotify,errors}.mjs`                                            | Spotify route calls, response decoding, safe status mapping            |
| `src/{inputs,resolve,queries}.mjs`                                    | Strict inputs, local matching, search/playback/playlists               |
| `src/{playback,library,dispatch}.mjs`                                 | Ordered mutations and tool dispatch                                    |
| `test/{contract,protocol,spotify,queries,mutations,package}.test.mjs` | Deterministic tests without accounts                                   |
| `test/{fake-host,fixtures}.mjs`                                       | Protocol-level host fixture and synthetic Spotify payloads             |
| `test/host-contract/`                                                 | Public schema/transcript fixtures pinned to the tested host API commit |
| `scripts/{check_manifest,package}.py`                                 | Standard-library checks and deterministic archive/descriptor build     |
| `SETUP.md`, `PRIVACY.md`, `TERMS.md`, `VERIFICATION.md`, `LICENSE`    | Setup, data handling, provider terms, evidence, MIT source license     |

Cross-repository dependency: host Task 2 must freeze wire definitions before Task 1 below; host Task 13 must pass before final integration. This plan does not invent a parallel protocol or claim sandbox safety from Spotify mocks.

## Task 1: Pin the host contract and declare exact Spotify access

**Files:** Create `ability.json`, `package.json`, `scripts/check_manifest.py`, `test/contract.test.mjs`, and `test/host-contract/{manifest.schema.json,protocol.json,contract-lock.json}`; update root `catalog.json` only when implementation starts.

**Interfaces:** `ability.json` uses format/API version 1 and the host's defined repository identity, node runtime, entrypoint `src/worker.mjs`, tool schemas, HTTPS rule IDs, OAuth profile, and owner-only result policy. `contract-lock.json` records the actual reviewed host commit and hashes of public schema/transcript fixtures; no dependency on a sibling checkout at runtime. `check_manifest.py` checks the exact required Spotify routes/scopes and package invariants; the host validator remains authoritative for complete schema semantics.

- [ ] Write tests asserting all eleven tools are owner-only, no direct network/helper/filesystem grant exists, scopes equal the six approved values, and public-playlist creation is disallowed. Use `assert.equal(manifest.tools.length, 11)` and a sorted exact-scope comparison, not subset tests. Assert provider origins are exactly `https://accounts.spotify.com` and `https://api.spotify.com` in their respective roles.
- [ ] Run `node --test abilities/spotify/test/contract.test.mjs`; expect RED before the manifest and lock are correct.
- [ ] Create the manifest against host Task 2's exported schema. Name rules `search`, `playback`, `devices`, `currently-playing`, `play`, `transfer`, `pause`, `next`, `previous`, `queue`, `volume`, `playlists`, `playlist`, `create-playlist`, `add-items`, and `save-tracks`; map only to approved methods/routes. Token/authorization endpoints belong to the OAuth profile and cannot be requested by worker HTTP rules. Constrain creation to private, noncollaborative playlists. Freeze bounded query/body schemas and use host rule IDs rather than caller URLs.
- [ ] Use per-Ability `package.json` with `private: true`, ES modules, Node `>=24`, and no dependencies. Set catalog status `development`, version `null`. Document that manifest package version `0.1.0` is a development artifact, not a published catalog release. Rerun contract and root repository checks; commit `feat(spotify): define Ability permissions`.

## Task 2: Implement protocol and provider transport without credentials

**Files:** Create `src/{worker,protocol,spotify,errors}.mjs`, `test/{protocol,spotify}.test.mjs`, and `test/{fake-host,fixtures}.mjs`.

**Interfaces:** `createProtocol({ input, output, invoke })` returns `{ close() }` and follows the host's frozen JSON-RPC transcript. `createSpotifyClient({ capability, signal })` returns `{ request(ruleId, values): Promise<SpotifyReply> }`; `SpotifyReply` contains bounded status/body values for worker-local use. `mapSpotifyFailure(replyOrError)` returns an approved status code plus an owner-only display payload. The worker never implements OAuth or accepts a token field.

- [ ] Write protocol tests for fragmented/interleaved frames, oversize input, unexpected method, cancellation, host EOF, invalid schemas, duplicate IDs, unsolicited notifications, and stderr content. Fake-host capability transcripts assert the worker asks for a rule ID and structured values, never a token or arbitrary URL. Provider tests cover empty `200/204`, JSON content types, malformed/truncated replies, `401/403/404/429/5xx`, and token/name sentinels in error bodies.
- [ ] Run `node --test abilities/spotify/test/protocol.test.mjs abilities/spotify/test/spotify.test.mjs`; expect RED.
- [ ] Implement bounded stdio and per-invocation abort propagation. Delegate authentication/refresh to the host; the worker's `401` outcome requests reconnection only after the host's defined refresh behavior. Parse JSON only when nonempty and expected. Treat transport uncertainty separately from a confirmed provider rejection. On `429`, respect host-bounded `Retry-After` only when it fits the remaining invocation time; return a rate-limited result otherwise. Never retry non-idempotent calls after timeout, `5xx`, or unknown delivery. Do not log raw provider responses or exception strings.
- [ ] Rerun tests and compare actual wire frames against the pinned host transcript. Assert generic outcomes never contain provider error text or credential sentinels; commit `feat(spotify): add host-mediated transport`.

## Task 3: Search and resolve targets locally

**Files:** Create `src/{inputs,resolve,queries}.mjs`, `test/queries.test.mjs`; extend synthetic fixtures.

**Interfaces:** `parseToolInput(tool, value)` returns a strict validated input; `resolveTarget(items, request)` returns `{ kind: 'selected', item } | { kind: 'choice', items } | { kind: 'missing' }`; `createQueryTools(client)` returns `search(input)`, `playback(input)`, and `playlists(input)`. Each tool returns the host's owner-only outcome shape. Item identifiers remain in owner-result private action data; the host mints opaque handles.

- [ ] Test default search limit five, maximum ten, one to four supported types, null items, missing optional fields, pagination, relinked IDs, empty playback, missing/restricted devices, duplicate names and multiple recordings with identical title/artist. Assert exact unique title/artist matches resolve locally and ambiguous matches return choices. Reject unrecognized keys, caller URLs, stale selection payloads and invalid resource types. Selections are validated by the host first; worker tests must not imply they can authorize themselves.
- [ ] Run `node --test abilities/spotify/test/queries.test.mjs`; expect RED.
- [ ] Implement NFKC/case/whitespace normalization for exact matching while preserving other punctuation. Never use embeddings or an LLM to rank Spotify results. Request at most ten playlist entries per page; pagination uses bounded offset values bound to a host selection/continuation handle, not a provider `next` URL. Search queries are 1–300 characters. Return escaped display fields, Spotify links, and private action data only through the owner-only channel. Store no provider catalog on disk.
- [ ] Rerun tests with repeated-title/artist and changed-account fixtures. Verify a no-active-device response explains setup instead of choosing a different device. Commit `feat(spotify): search and select playback targets`.

## Task 4: Execute playback, playlist, and library mutations once

**Files:** Create `src/{playback,library,dispatch}.mjs`, `test/mutations.test.mjs`; extend inputs and worker dispatch.

**Interfaces:** `createPlaybackTools(client, resolveTarget)` returns `play`, `pause`, `skip`, `queue`, `volume`; `createLibraryTools(client, resolveTarget)` returns `create_playlist`, `add_to_playlist`, `save_tracks`. `dispatchTool({ tool, arguments: input, selection, client, signal })` returns a host-protocol outcome. `selection` is resolved by the host from an opaque handle and passed privately to the worker. Tool schemas also support user-supplied Spotify URIs; provider IDs retrieved from Spotify never enter model-visible results.

- [ ] Write transcript assertions for exact method/rule/value shape of each mutation. Cover default active device, explicit transfer, lost/restricted device, volume bounds `0/100`, both skip directions, queue one track, track lists of 1–40 items, private playlist creation, playlist permission denial, and save via `/me/library`. Assert `public === false` and `collaborative === false`; reject album/playlist URIs in save-tracks. Playlist name is 1–100 characters; description maximum 300.
- [ ] Test create success followed by add failure, remote success followed by connection loss, cancellation between steps, duplicate invocation delivery, and a device changing between lookup and action. Assert no automatic duplicate create/add/queue/skip, unknown outcomes remain uncertain, and no playback moves silently to a newly active device.
- [ ] Run `node --test abilities/spotify/test/mutations.test.mjs`; expect RED.
- [ ] Implement mutations serially within an invocation, always resolving the target before dispatch. Pass the discovered device ID explicitly for that command; if unavailable, stop instead of retrying on another device. Resolve all ambiguous songs before creating a playlist. Add at most forty tracks per tool invocation, keeping the list within current provider limits. Treat a creation followed by failed additions as a partial result with the playlist link only in the owner UI. Use the host's invocation receipt mechanism for at-most-once admission; never create an independent worker retry journal containing provider data. A fresh user request is required after uncertainty.
- [ ] Rerun all package tests. Recheck official endpoint definitions before declaring API mapping complete and record the verification date; commit `feat(spotify): control playback and library`.

## Task 5: Build the sealed artifact and personal setup guide

**Files:** Create `scripts/package.py`, `test/package.test.mjs`, `SETUP.md`, `PRIVACY.md`, `TERMS.md`, `VERIFICATION.md`, `LICENSE`; update `README.md`, `CHANGELOG.md`, root README and `.github/workflows/ci.yml`.

**Interfaces:** `python3 abilities/spotify/scripts/package.py --output <directory>` produces `spotify-0.1.0.dot-ability.tar.gz` and `spotify-0.1.0.json` using the host release-descriptor schema. The script records the actual source commit, includes a file inventory and applicable license notices, and hashes the exact archive bytes; it refuses dirty/uncommitted package source for release-mode output. Test fixtures may request an explicit development-artifact mode that the descriptor labels accordingly.

- [ ] Test deterministic bytes for the same source, manifest/archive agreement, license inclusion, source commit capture, entrypoint presence, unsupported platform claims, dirty source, accidental secrets, symlink input, and exclusion of tests/caches/developer files. The host's real validator must accept the generated development artifact; a manifest-only local check is insufficient.
- [ ] Run `node --test abilities/spotify/test/package.test.mjs`; expect RED.
- [ ] Package only explicit allowlisted files with Python `tarfile`/`gzip`, stable ordering/timestamps/modes, and no symlinks. Include no runtime dependency installation. Derive supported platforms from verified host evidence, not all Node-compatible systems. CI runs `node --test abilities/spotify/test/*.test.mjs`, `python3 abilities/spotify/scripts/check_manifest.py`, root repository checks and packaging checks. Pin/review any new Actions code before execution; do not publish/tag automatically or use secrets.
- [ ] Write the guide with the exact registered callback `http://127.0.0.1/abilities/oauth/callback`, personal client ID, developer allowlist, Premium, opening a Spotify player, reconnect/disconnect, and common failure states. Explain that music keeps playing when Dot quits, results appear directly in the UI, and approved actions need no repeated permission prompt. Include accurate privacy/retention/disconnect disclosures and provider-required notices; do not claim Spotify endorsement or guaranteed legal sufficiency. Link the official policy and current API documents. Keep source/development artifact/live verification status separate.
- [ ] Run all package/root checks, build twice and compare archive digests, inspect the allowlisted contents, and commit `feat(spotify): package Ability and setup guide`. Catalog version stays null until an authorized release actually exists.

## Task 6: Verify the real host path and prepare the PR

**Files:** Update `VERIFICATION.md`, package/root README status, and `CHANGELOG.md`; add a host integration fixture entry to My-Own-Dots `scripts/abilities/smoke.mjs` only in that repository's worktree if needed.

**Interfaces:** Invoke the host's public sealed-artifact smoke interface from Task 13, passing a temporary workspace and the generated package. Use an injected fake provider inside the integration harness only; production manifests retain public Spotify origins and the production broker never gains a localhost bypass.

- [ ] Exercise reviewed install, selected-Dot consent, personal-app configuration, mock PKCE, search/selection, every mutation, private/owner-only result projection, and typed/voice routing. Test cross-Dot attempts, permissions expanded in an update, grant revocation during refresh/action, disabled/re-enabled Ability, disconnect, expired selection, quit, desktop crash, backend disconnect, and restored-disabled binding.
- [ ] Capture actual model requests, persisted events, memory/summary inputs, diagnostics, and AI speech inputs. Assert sentinel provider content and fake credentials never occur in any capture, while the owner card displays the expected result. Assert no Spotify app/process termination is attempted on Dot quit. Run an uncertain-mutation restart test proving the host does not replay it.
- [ ] Run package checks, host full checks with the dedicated test database, real macOS Ability acceptance, and the packaged host smoke. Record commits, OS/architecture, artifact digest, check outputs, and remaining limits. Obtain an independent whole-change review before reporting ready. Fix findings and repeat only affected checks plus required final gates.
- [ ] Commit `test(spotify): verify packaged Dot integration`; push and wait for current-commit push checks before opening the Spotify PR, then verify PR checks. Keep the host PR and dependency commit linked in the description. Do not merge/publish a claim of live Spotify support from mock evidence.
- [ ] After the owner connects Spotify and authorizes the named live test actions, verify real search, devices, playback, queue/volume where supported, creation/addition to a named private test playlist, and saving the agreed test track. Record success/failure independently of fixture checks. Until authorization/account access arrives, report this step as pending; do not fabricate or infer live acceptance.

## Plan self-review

- All eleven tools, the six scopes, exact provider origins, personal OAuth setup, active-device/private-playlist defaults, error/uncertainty handling, ownership, packaging and independent versioning are covered.
- Host account handling and sandbox enforcement are dependencies, not duplicated worker features. Public protocol fixtures are pinned and reviewed before implementation.
- Review Focus items have specific tests. Provider results stay on the owner-only path through success, failure, cancellation and voice delivery.
- Automated/source completion, packaged integration, live account testing and release publication remain separate claims. This written plan and execution method still require owner review before implementation.
