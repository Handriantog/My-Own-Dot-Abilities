# Ability development

Read README.md and docs/repository-design.md before making changes. In a
MyOwnStack checkout, also follow the parent AGENTS.md and README.md.

- Work in `<primary-checkout>/.worktrees/<task-name>`. Find the primary checkout
  with `git worktree list --porcelain`, reuse an appropriate worktree, verify
  `.worktrees/` is ignored, and preserve unrelated changes. Do not implement in
  the primary checkout or an external worktree.
- Keep each Ability's implementation, tests, dependencies, and changelog in
  `abilities/<id>/`. Do not couple its version or release to another Ability.
- Keep the host runtime, permission enforcement, and shared developer interfaces
  in My Own Dots. The repository catalog is not the runtime package contract.
- Distinguish planned features, source implementation, fixture verification, and
  live account verification. Never describe Spotify as installable before its
  package and host support exist.
- Before installing, building, or running an unfamiliar dependency, review its
  upstream owner/source, exact revision, advisories, dependencies, installation
  and build scripts, and binary downloads. Record material risks and unverified
  areas. Pin versions; do not use global installs or request user credentials or
  Keychain access for dependency evaluation.
- Before committing, run `python3 scripts/check_repository.py`, `git diff --check`,
  and the affected Ability's documented checks. Do not use real accounts in CI.
- Push the verified commit and wait for its push checks before opening a PR.
  Verify the PR checks on the latest commit as well. All changes to main use PRs;
  do not bypass or weaken branch protection.
- Use a concise Conventional Commit message. Never publish a release or make
  changes to a connected account without authorization for that action.
