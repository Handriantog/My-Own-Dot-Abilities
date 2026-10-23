#!/usr/bin/env python3
"""Local package invariants. The Dot host remains the full schema authority."""
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
PLAYBACK = {"play", "pause", "next", "previous", "volume", "seek", "shuffle", "repeat", "play_uri"}
UI = {"search", "playlists", "save_current", "create_playlist", "add_to_playlist"}

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

def validate(root=ROOT):
    manifest = read(root / "ability.json")
    require(manifest["formatVersion"] == manifest["apiVersion"] == 1, "Unsupported API")
    require(manifest["id"] == "spotify-local" and manifest["license"] == "MIT", "Wrong identity/license")
    require(manifest["source"] == {"owner": "handriantog", "repository": "my-own-dot-abilities"}, "Wrong repository")
    require(manifest["platforms"] == ["darwin-arm64"], "Unverified platform claim")
    require(manifest["entrypoint"] == {"runtime": "javascript", "path": "src/worker.mjs"}, "Wrong entrypoint")
    require(manifest["helpers"] == [], "No worker helpers approved")
    require(manifest["settings"] == {"type": "object", "properties": {}, "required": [], "additionalProperties": False}, "No account settings approved")
    tools = manifest["tools"]
    require(len(tools) == 13 and {t["id"] for t in tools} == (PLAYBACK | UI) - {"play_uri"}, "Wrong tools")
    require(all(t["visibility"] == "owner-only" and t["output"] == {"type": "null"} for t in tools), "Provider data must be owner-only")
    require(all(t["channels"] == ["text", "voice"] and t["input"]["additionalProperties"] is False for t in tools), "Wrong tool contract")
    rules = manifest["permissions"]
    require(len(rules) == 2 and {p["id"] for p in rules} == {"playback", "library-ui"}, "Wrong permission inventory")
    for rule in rules:
        expected = PLAYBACK if rule["id"] == "playback" else UI
        require(set(rule) == {"id", "kind", "purpose", "application", "actions"}, "Unexpected permission field")
        require(rule["kind"] == "app-control" and rule["application"] == "com.spotify.client", "Unapproved capability/application")
        require(len(rule["actions"]) == len(expected) and set(rule["actions"]) == expected, "Action expansion")
    package = read(root / "package.json")
    require(package["private"] is True and package["type"] == "module" and package["engines"]["node"] == ">=24", "Wrong worker packaging")
    require(not any(package.get(key) for key in ("dependencies", "devDependencies", "optionalDependencies")), "Unexpected dependency")
    return manifest

if __name__ == "__main__":
    try:
        validate()
    except (ValueError, TypeError, KeyError, OSError):
        print("Spotify Local manifest checks failed.", file=sys.stderr)
        sys.exit(1)
    print("Spotify Local manifest checks passed: owner-only tools, exact app/actions, no account credentials")
