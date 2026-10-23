# Mouse Mover

Ask your Dot to carry the pointer gently and keep the display awake. Say or type
“Start Mouse Mover”, “Stop Mouse Mover”, or “Is Mouse Mover running?”.

**Development package 0.1.0; no public release.** Requires the current My Own Dots
desktop on macOS 26 Apple Silicon with companion activities, pointer control,
and display keep-awake (API 1 host contract commit
`9024a2e4efa644ac97533c91a663b8a335d65a4b` or later). Older strict API 1 hosts
reject the new fields; there is no published desktop version floor yet.
See [setup](SETUP.md), [permissions](ability.json) and [verification](VERIFICATION.md).

Your Dot reaches for the pointer with its right plush hand, then carries it on a
gentle closed path. The package owns the carrying pose, 1.6-second approach and
24-second loop across 160 × 96 logical pixels. The host keeps the hand and cursor
together across displays.

Manual mouse use takes priority immediately. Movement resumes after five seconds
without mouse activity. The display and system stay awake during this pause.
Ask to stop, disable the Ability, remove its grant, or quit Dot to release both
pointer movement and keep-awake. Installing, enabling, restarting and scheduled
work do not start it; only an explicit owner text or voice request can.

## Development

Node 24+ and Python 3.11+; no dependencies or installation scripts. From the root:

```sh
python3 abilities/mouse-mover/scripts/check_manifest.py
node --test abilities/mouse-mover/test/*.test.mjs
python3 scripts/check_repository.py
python3 -m unittest discover -s scripts -p 'test_*.py'
git diff --check
python3 abilities/mouse-mover/scripts/package.py --development --output dist/mouse-mover-check
```

The independent packager uses an explicit allowlist, deterministic tar/gzip,
MIT license and per-file inventory. Output files use exclusive creation: choose a
new output directory each run. Tests, scripts, caches and environment files are
excluded. The worker imports only its own source, never host or other Ability
internals. The host enforces interactive admission, grants, native movement and
cleanup; the worker sends only the public `companion-activity` command.

Development descriptors record the source commit and dirty state, use a
`mouse-mover/development-<commit>` tag and placeholder asset ID, and are for local
acceptance. Release packaging requires clean committed source and a real GitHub
asset ID via `--asset-id`; it never publishes. Publication requires separate
approval. Original source and icon are [MIT](LICENSE).
