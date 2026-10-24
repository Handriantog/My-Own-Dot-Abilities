# My Own Dot Abilities

Teach your Dots new capabilities.

This repository hosts independently developed and versioned **Abilities** for
[My Own Dots](https://github.com/Handriantog/My-Own-Dots). An Ability is installed
once in a workspace and enabled for selected Dots, with explicit permissions.
Other developers can publish Abilities in their own repositories.

**Status:** Mouse Mover, Spotify Web API and Spotify Local have independent
dependency-free workers for the version-one Dot Ability host.
There are no published Ability releases yet. The host owns permission enforcement,
account credentials and execution; this collection owns individual workers.

## Abilities

| Ability                                        | Purpose                                              | Status                                          |
| ---------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------- |
| [Spotify Web API](abilities/spotify/README.md) | Search, playback control, playlists, and saved songs | Packaged fixtures verified; live checks pending |
| [Spotify Local](abilities/spotify-local/README.md) | Desktop playback, search, saved songs and playlists | Development package; core local controls live-tested |
| [Mouse Mover](abilities/mouse-mover/README.md) | Carry the pointer and keep the display awake on request | Development package; native acceptance pending |

[catalog.json](catalog.json) is the machine-readable development index. It is
not an installer manifest and does not authorize execution or grant permissions.

## Browse and install

In Dot, open **Abilities** below Memory. Search installed Abilities and the GitHub
collection, then select one to read its full README and permissions. Unreleased
entries show their development status; they have no collection Install action.

For a local development package, use **+ (Add Ability) → Choose local Ability…**.
For a published package from another GitHub repository, use the same menu and
enter its release descriptor URL. Open **Install** in the detail header, review
the actual access and storage paths, then approve installation. New installs stay
disabled. Choose **Enable**, then assign individual Dots or **Apply to all Dot**.

**Disable** preserves per-Dot choices. **Uninstall** confirms removal of the
selected version from all Dots and keeps its private files. Other separately
approved versions remain installed. See each Ability's setup guide for OS or
account requirements.

## Repository layout

```text
abilities/
  spotify/             # One independent directory per Ability
    README.md
    CHANGELOG.md
catalog.json           # Ability IDs, paths, status, and released versions
docs/
  repository-design.md # Boundaries, packaging, and independent releases
templates/
  ability/             # Documentation starter for a new Ability
scripts/
  check_repository.py  # Dependency-free repository checks
```

Each Ability owns its source, tests, dependency files, documentation, and
changelog inside its directory. There is no root JavaScript or Python dependency
environment: different Abilities may use different languages and toolchains.
See the [repository design](docs/repository-design.md) and
[contribution guide](CONTRIBUTING.md).

## Development

Repository checks use Python 3.11+ standard library; Ability tests use Node 24+:

```sh
python3 scripts/check_repository.py
python3 -m unittest discover -s scripts -p 'test_*.py'
python3 abilities/spotify/scripts/check_manifest.py
python3 abilities/spotify-local/scripts/check_manifest.py
python3 abilities/mouse-mover/scripts/check_manifest.py
node --test abilities/*/test/*.test.mjs
git diff --check
```

All three packages include safe vector icons and need the current icon-aware
API 1 desktop host. Mouse Mover also needs companion activities, native pointer
control and display keep-awake; see its setup guide for the exact contract pin.
Installing and enabling Mouse Mover do not start it. An explicit text/voice
request starts a pickup, descent and walk along the usable display floor. Manual
mouse use yields immediately, and movement resumes
after five seconds of mouse inactivity. There are no public releases.

Use feature branches and repository-local `.worktrees/`. Changes to `main` go
through pull requests with passing **Repository checks**, an up-to-date branch,
and resolved review conversations. Force pushes and deletion are blocked, and
protection applies to administrators. A second person's approval is not required
for the current solo-maintainer workflow.

## License

Original repository content is licensed under [MIT](LICENSE). Dependencies and
bundled third-party assets retain their own licenses and notices. Every published
Ability must include the applicable license files. Spotify names and services
belong to Spotify; this is an independent project.
