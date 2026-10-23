# Setup

Use the current My Own Dots desktop on macOS 26 Apple Silicon with companion
activities, pointer control and display keep-awake. The public contract is API 1
at host commit `9024a2e4efa644ac97533c91a663b8a335d65a4b`; older strict hosts reject
these fields. No public desktop version floor or Ability release exists yet.

1. In **Abilities**, use **+ (Add Ability) → Choose local Ability…** and choose
   the local development descriptor/archive from this package.
2. Review its identity, actual installation folder and pointer/display access,
   then approve installation. Installation starts disabled.
3. Enable Mouse Mover and select the Dots allowed to use it. Approve the
   `movement` permission for the chosen Dot and any desktop OS consent shown by
   the host. No account, helper or workspace-file access is requested.
4. Say or type “Start Mouse Mover”. Ask for its status or say “Stop Mouse Mover”.

Manual mouse use pauses movement immediately; five seconds of mouse inactivity
lets it resume. Display keep-awake remains active while paused. Disable Mouse
Mover or quit Dot if an invocation reports an uncertain result; do not assume
that uncertainty means an attempted start had no effect.

The host owns permission prompts, admission and cleanup. This worker cannot
request arbitrary OS commands, install drivers, log in to an account or activate
itself on enablement. Browser-only Dot sessions cannot drive the native pointer.
