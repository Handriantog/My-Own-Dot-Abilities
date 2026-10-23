# Repository design

## Ownership

My Own Dots owns the Ability installer, execution environments, permissions,
account credential handling, per-Dot grants, lifecycle supervision, and shared
developer interfaces. This repository owns the individual Ability packages and
their documentation, tests, and release assets.

The user-facing feature is **Abilities**. Teaching an Ability enables it for a
selected Dot. Installation is shared; enablement, grants, settings, and private
Ability state are scoped to each Dot. No Dot silently inherits another's grants.

These are the agreed product requirements. Current host implementation and
verified boundaries are documented in My Own Dots; the collection does not
enforce them independently:

- Anyone may develop and distribute an Ability through GitHub.
- Show the exact package identity/version and requested access before approving
  installation or executing any supplied setup code.
- Deny undeclared or unapproved access, enforced outside the Ability's code.
- Support JavaScript/TypeScript, Python, and native executables through a common
  host contract. The current host verifies confinement on macOS 26 Apple Silicon.
- The host offers scoped HTTPS, OAuth, confined helpers and enumerated
  Spotify-only local app control. General app/window/desktop automation, system
  services and drivers remain outside this scope. Keep dependencies private to
  each Ability.
- Stop Ability-owned processes and descendants when disabled or when Dot quits.
  Closing a window is not quitting. External apps such as Spotify may remain open.
- Require fresh consent when an update requests additional access.

## Multiple Abilities

Every directory directly under `abilities/` is one cataloged Ability. Each owns
its README, changelog, code, tests, dependency locks, and packaging configuration.
An Ability must not import another Ability's private source or depend on its
checkout being installed. Common host interfaces belong in My Own Dots; extract
shared libraries only when a concrete need establishes a stable boundary.

The root has no shared application runtime or language-specific workspace. This
allows a Python Ability and a native Ability to coexist without forcing either
into a JavaScript package structure.

`catalog.json` is a repository index with `catalogVersion: 1`. Entries contain a
unique `id`, display `name`, exact `abilities/<id>` path, `status`, latest published
`version` (null before release), and `license`. Status is `planned`, `development`,
or `released`. This index must not be used as an execution manifest or proof that
an Ability is trusted. Installable package manifests follow the host's public API contract; Spotify
pins its schema and protocol fixtures to a tested host commit.

## Independent releases

Use one version per Ability, never a root version that forces unrelated releases:

- Tag: `<ability-id>/v<version>`, for example `spotify/v0.1.0`.
- Release title: `<Ability name> <version>`, for example `Spotify 0.1.0`.
- Release assets: contain only that Ability's package, dependencies needed at
  runtime, and license notices. Use separate OS/architecture artifacts when needed.
- A release identifies its source commit, supported Dot API version, supported
  platforms, requested permissions, checksums, and verification evidence.
- Update only the released Ability's changelog and catalog version. A monorepo
  source archive is not an installable multi-Ability package.

Publishing is a deliberate operation after permission enforcement and packaging
are implemented and verified. Do not tag the planned Spotify directory as a
working release. There is no publishing workflow or automatic release on merge
in this initial scaffold.

## Main branch and CI

Main requires a pull request, the GitHub Actions **Repository checks** result on
an up-to-date branch, resolved review conversations, and linear history. Force
pushes and deletion are disabled. Administrators follow the same rules. Required
approval count is zero to support the current solo maintainer, matching the Dots
repository's review policy; collaborators may still review changes.

The CI workflow uses a GitHub-hosted Ubuntu runner and system Python. It fetches
the public repository at the event's exact commit with plain Git, uses the
reviewed SHA-pinned GitHub setup-node action for Node 24.20.0, installs no
Ability dependencies, and requests no token permissions. There is no
`pull_request_target` workflow. Checks cover repository structure, catalog,
licenses, whitespace, Spotify manifest/worker tests and deterministic packaging.
Actual OS confinement and packaged-host acceptance run in the host repository.
