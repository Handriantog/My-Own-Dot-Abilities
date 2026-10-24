# Changelog

## Unreleased — 0.1.1 source

- Carry the pointer down to the usable display floor in 2.4 seconds, then walk
  left and right with normal grounded feet and smooth turns at up to 66 px/s.
- Keep the same carry pose, icon, 1.6-second pickup, manual pause and five-second
  idle resume. Start/stop/status tools and pointer/display access are unchanged.
- Require the generic floor-walk host contract. The pose loop never resets travel.

## 0.1.0 development source

- Add explicit text/voice start, stop and status tools with no account settings.
- Declare a package-owned right-hand carry pose and gentle 24-second closed path.
- Request pointer control with a five-second manual-input yield and display
  keep-awake until stop or authority loss, including manual-use pauses.
- Add a safe vector pointer icon, bounded standalone worker and deterministic
  development packager with no dependencies or cross-Ability runtime imports.

No public release or live owner acceptance is claimed.
