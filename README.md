# My Own Dot Abilities

Teach your Dots new capabilities.

This repository hosts independently developed and versioned **Abilities** for
[My Own Dots](https://github.com/Handriantog/My-Own-Dots). An Ability is installed
once in a workspace and enabled for selected Dots, with explicit permissions.
Other developers can publish Abilities in their own repositories.

**Status:** Spotify has a dependency-free worker implementation for the version-one Dot Ability host.
There are no published Ability releases yet. The host owns permission enforcement,
account credentials and execution; this collection owns individual workers.

## Abilities

| Ability                                | Purpose                                              | Status                                       |
| -------------------------------------- | ---------------------------------------------------- | -------------------------------------------- |
| [Spotify](abilities/spotify/README.md) | Search, playback control, playlists, and saved songs | Source implemented; verification in progress |

[catalog.json](catalog.json) is the machine-readable development index. It is
not an installer manifest and does not authorize execution or grant permissions.

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

Repository checks require Python 3.11 or newer and only its standard library:

```sh
python3 scripts/check_repository.py
git diff --check
```

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
