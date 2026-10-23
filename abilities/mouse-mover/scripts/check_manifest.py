#!/usr/bin/env python3
"""Dependency-free package invariants; the public Dot host is schema authority."""
import json
import math
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
EMPTY = {"type": "object", "properties": {}, "required": [], "additionalProperties": False}
POSE = {"leftArm": (-3.2, 3.2), "rightArm": (-3.2, 3.2),
        "leftArmLength": (20, 70), "rightArmLength": (20, 70), "lean": (-.35, .35),
        "bodyY": (-10, 10), "leftFootY": (-12, 12), "rightFootY": (-12, 12)}

def require(condition, message):
    if not condition:
        raise ValueError(message)

def unique_keys(pairs):
    value = {}
    for key, item in pairs:
        require(key not in value, "Duplicate JSON field")
        value[key] = item
    return value

def read(path):
    return json.loads(path.read_text(), object_pairs_hook=unique_keys)

def number(value, low, high):
    return type(value) in (int, float) and math.isfinite(value) and low <= value <= high

def validate(root=ROOT):
    m = read(root / "ability.json")
    require(m["formatVersion"] == m["apiVersion"] == 1, "Unsupported API")
    require(m["id"] == "mouse-mover" and m["license"] == "MIT", "Wrong identity/license")
    require(m["source"] == {"owner": "handriantog", "repository": "my-own-dot-abilities"}, "Wrong repository")
    require(m["platforms"] == ["darwin-arm64"], "Unverified platform claim")
    require(m["entrypoint"] == {"runtime": "javascript", "path": "src/worker.mjs"}, "Wrong entrypoint")
    require(m["helpers"] == [] and m["settings"] == EMPTY, "No helpers or settings approved")
    require(len(m["tools"]) == 3 and {t["id"] for t in m["tools"]} == {"start", "stop", "status"}, "Wrong tools")
    for tool in m["tools"]:
        require(tool["execution"] == "interactive" and tool["channels"] == ["text", "voice"], "Explicit text/voice intent required")
        require(tool["input"] == EMPTY and tool["output"] == {"type": "null"} and tool["visibility"] == "owner-only", "Wrong tool contract")
    require(len(m["activities"]) == 1, "One activity required")
    a = m["activities"][0]
    require(set(a) == {"id", "durationMs", "approachMs", "loop", "motion", "keyframes", "pointer", "keepAwake"}, "Unexpected activity field")
    require(a["id"] == "carry-pointer" and a["loop"] is True, "Wrong activity")
    require(a["pointer"] == {"hand": "right", "idleMs": 5000} and a["keepAwake"] == "display", "Wrong pointer/awake declaration")
    require(type(a["durationMs"]) is int and number(a["durationMs"], 1000, 120000), "Invalid duration")
    require(type(a["approachMs"]) is int and number(a["approachMs"], 250, 10000), "Invalid approach")
    require(set(a["motion"]) == {"width", "height"} and number(a["motion"]["width"], 0, 1200) and number(a["motion"]["height"], 0, 800), "Invalid motion bounds")
    frames = a["keyframes"]
    require(2 <= len(frames) <= 32 and frames[0]["at"] == 0 and frames[-1]["at"] == 1, "Invalid keyframes")
    previous = -1
    for frame in frames:
        require(set(frame) == {"at", "x", "y", "pose"}, "Unexpected keyframe field")
        require(number(frame["at"], 0, 1) and frame["at"] > previous, "Invalid frame order")
        previous = frame["at"]
        require(number(frame["x"], -1, 1) and number(frame["y"], -1, 1), "Invalid frame position")
        require(set(frame["pose"]) == set(POSE) and all(number(frame["pose"][key], *bounds) for key, bounds in POSE.items()), "Invalid pose")
    require(all(frames[0][key] == frames[-1][key] for key in ("x", "y", "pose")), "Loop endpoints differ")
    require(len(m["permissions"]) == 1, "Wrong permission inventory")
    rule = m["permissions"][0]
    require(set(rule) == {"id", "kind", "purpose", "activities", "pointer", "keepAwake"} and rule["id"] == "movement" and rule["kind"] == "companion-activity" and rule["activities"] == ["carry-pointer"] and rule["pointer"] is True and rule["keepAwake"] == "display", "Unapproved capability")
    icon = m["icon"]
    require(icon == {"background": "#245C78", "foreground": "#FFFFFF", "paths": ["M7 2 L18 13 L13 14 L16 20 L13 22 L10 16 L6 20 Z"]}, "Unreviewed icon geometry")
    package = read(root / "package.json")
    require(package["version"] == m["version"] and package["private"] is True and package["type"] == "module" and package["engines"]["node"] == ">=24", "Wrong worker packaging")
    require(not any(package.get(key) for key in ("dependencies", "devDependencies", "optionalDependencies")), "Unexpected dependency")
    return m

if __name__ == "__main__":
    try:
        validate()
    except (ValueError, TypeError, KeyError, OSError, IndexError):
        print("Mouse Mover manifest checks failed.", file=sys.stderr)
        sys.exit(1)
    print("Mouse Mover manifest checks passed: interactive tools, exact pointer/display grant, closed bounded path")
