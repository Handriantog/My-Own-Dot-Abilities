# Ability name

Describe the capability this Ability teaches a Dot and who it helps.

**Status: planned.** Replace this status only when implementation or a verified
release exists.

## Capabilities

List concrete actions and a few example user requests.

## Permissions and data

Explain every requested capability, the account/folder/network scope, what data
leaves the computer, and how users revoke access. Describe background activity
and any setup scripts. A declared permission is a request, not a grant.

## Setup and compatibility

Document supported Dot versions, operating systems/architectures, runtime and
dependency requirements, account setup, and any provider restrictions. Keep
dependencies local to this Ability and commit exact dependency locks.

## Development and verification

Document build and test commands, fixture coverage, and remaining live checks.
Keep credentials and real account data out of source and CI.

## Lifecycle

Describe startup, cancellation, disabling, shutdown, saved-state cleanup, and any
external actions that cannot be undone. Ability-owned helpers stop when Dot quits.

## License

Original contributions use the root MIT license. List and preserve third-party
licenses for dependencies and bundled assets.
