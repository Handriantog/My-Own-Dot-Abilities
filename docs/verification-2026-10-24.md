# Integrated package verification — October 24, 2026

Final development archives were built from clean source commit
`d2b874679978456e61ce2304a89d277533e0bbad` with each Ability's
`scripts/package.py --development --output dist/task5-delivery/<id>`.
This external verification record is outside the package allowlists; it does not
alter those frozen archives. There is no public release.

| Package | Version | Archive SHA-256 |
| --- | --- | --- |
| Mouse Mover | 0.1.0 | `2a327465703d08a24a58026ef8b61bb58c87e38bf8cc8bd920b03a8ed84d19b5` |
| Spotify | 0.1.1 | `f262296d7f726767c4e361df495adb8523490bd7647d1a84b0f699f57ae7c675` |
| Spotify Local | 0.1.1 | `6149c34a6ef1f93f725a0524d540825f57e996757eb8bd3fa80de2da60c2903c` |

Collection verification passes 164 Node worker/protocol/packaging tests, three
Python icon-validation tests, all three manifest checks, repository validation
and whitespace checks. Following documentation-only polish, the 38 affected
Mouse Mover tests pass; packaging was repeated from clean commits.

The My Own Dots production installer extracts and seals every final archive.
Seven production integration tests pass against the frozen final bytes. Mouse
Mover runs its real confined worker through the separately bundled Ability host,
SQLite service and HTTP desktop bridges. Fake native effects verify that install
and enable do not start it, explicit text/voice can start/status/stop, manual input
reports pause, repeated stop is safe, background work is denied and revoke cleans
up. Accessibility and unavailable-desktop errors retain their fixed public codes
across the bundle boundary. No owner cursor or workspace is used.

The actual companion rig renders the package's right-hand pose and timing:
1,600 ms approach, 5,000 ms idle resume, 823 frames, 240 fake moves, maximum
rendered-palm error `1.2710574864626038e-13` logical pixels and no retained sleep
blocker. Production Ability UI captures cover all three icons, catalog/installed
lists, package READMEs, permissions and review footers at 1,120px/360px in light
and dark themes. The controller inspected the rig and representative captures.
The README now puts owner behavior before authoring details; setup names desktop
selection and the existing macOS Accessibility setting.

See the host's `docs/desktop/abilities-verification.md` and frozen
`tests/fixtures/abilities/mouse-mover/PROVENANCE.md` for full local evidence.
These checks do not establish real pointer alignment, live multi-monitor behavior,
macOS consent attribution, hardware sleep/monitor behavior, microphone acceptance
or account behavior. Nothing was installed into the owner's app, merged,
published or released by these verification steps.
