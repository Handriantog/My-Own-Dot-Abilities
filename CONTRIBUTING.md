# Contributing an Ability

An Ability can be developed here or in an independent GitHub repository. This
repository is a collection of first-party Abilities, not a mandatory registry.

## Add an Ability

1. Choose a unique lowercase, hyphen-separated ID, such as `spotify`.
2. Copy `templates/ability/` to `abilities/<id>/` and write its documentation.
3. Add a catalog entry with `status: "planned"` and `version: null`. Use
   `development` when implementation starts and `released` only after publishing
   an installable, verified release. `version` is the latest published version;
   leave it null until one exists.
4. Keep source, tests, exact dependency locks, and any packaging configuration
   inside that Ability's directory. Select its language based on its needs.
5. Document permissions, setup, supported operating systems/architectures, data
   handling, stopping behavior, and verification commands. Never commit tokens,
   account data, or real `.env` files.
6. Run repository checks and the Ability's own checks, then submit a pull request.

Dependency setup must use an Ability-specific environment. Installation scripts
and native downloads receive the same review as runtime code. A private directory
or Python virtual environment avoids dependency conflicts; it is not a security
sandbox.

## Checks and review

```sh
python3 scripts/check_repository.py
git diff --check
```

CI currently validates repository structure and catalog consistency. It does not
prove permission isolation or live Spotify behavior. As implementations arrive,
add their fixture tests to CI and make the required check depend on their results.
Never run untrusted pull-request code with repository secrets or real accounts.

See [release conventions](docs/repository-design.md#independent-releases) before
preparing a release. The MIT license covers original contributions; preserve all
third-party notices and verify distribution rights before bundling assets.
