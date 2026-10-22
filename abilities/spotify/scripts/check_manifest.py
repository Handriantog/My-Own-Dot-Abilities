#!/usr/bin/env python3
"""Dependency-free Spotify invariants; the pinned host remains schema authority."""
import hashlib
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
SCOPES = {"user-read-playback-state", "user-read-currently-playing", "user-modify-playback-state",
          "playlist-read-private", "playlist-modify-private", "user-library-modify"}
ROUTES = {
    "search": ("GET", "v1/search"), "playback": ("GET", "v1/me/player"),
    "devices": ("GET", "v1/me/player/devices"), "currently-playing": ("GET", "v1/me/player/currently-playing"),
    "play": ("PUT", "v1/me/player/play"), "transfer": ("PUT", "v1/me/player"),
    "pause": ("PUT", "v1/me/player/pause"), "next": ("POST", "v1/me/player/next"),
    "previous": ("POST", "v1/me/player/previous"), "queue": ("POST", "v1/me/player/queue"),
    "volume": ("PUT", "v1/me/player/volume"), "playlists": ("GET", "v1/me/playlists"),
    "playlist": ("GET", "v1/playlists/{playlistId}"), "create-playlist": ("POST", "v1/me/playlists"),
    "add-items": ("POST", "v1/playlists/{playlistId}/items"), "save-tracks": ("PUT", "v1/me/library"),
}
TOOLS = {"search", "playback", "play", "pause", "skip", "queue", "volume", "playlists",
         "create_playlist", "add_to_playlist", "save_tracks"}


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
    require(manifest["id"] == "spotify" and manifest["license"] == "MIT", "Wrong identity/license")
    require(manifest["source"] == {"owner": "handriantog", "repository": "my-own-dot-abilities"}, "Wrong repository")
    require(manifest["platforms"] == ["darwin-arm64"], "Unverified platform claim")
    require(manifest["entrypoint"] == {"runtime": "javascript", "path": "src/worker.mjs"}, "Wrong entrypoint")
    require(manifest["helpers"] == [], "No helpers approved")
    require(len(manifest["tools"]) == 11 and {t["id"] for t in manifest["tools"]} == TOOLS, "Wrong tools")
    require(all(t["visibility"] == "owner-only" and t["output"] == {"type": "null"} for t in manifest["tools"]), "Provider data must be owner-only")
    permissions = manifest["permissions"]
    require(len(permissions) == 17 and len({p["id"] for p in permissions}) == 17, "Wrong permission inventory")
    oauth = [p for p in permissions if p["kind"] == "oauth"]
    require(len(oauth) == 1, "Exactly one Spotify account required")
    account = oauth[0]
    require(account["id"] == "spotify-account" and account["clientIdSetting"] == "clientId", "Wrong account binding")
    require(len(account["scopes"]) == 6 and set(account["scopes"]) == SCOPES, "Scope expansion")
    require(account["authorizationUrl"] == "https://accounts.spotify.com/authorize" and account["tokenUrl"] == "https://accounts.spotify.com/api/token", "Wrong authorization origin")
    require(account["resourceOrigin"] == "https://api.spotify.com", "Wrong credential destination")
    actual = {}
    for rule in permissions:
        if rule["kind"] == "oauth":
            continue
        require(rule["kind"] == "https" and rule["origin"] == "https://api.spotify.com" and rule["account"] == "spotify-account", "Unapproved capability/origin")
        actual[rule["id"]] = (rule["method"], "/".join(p if isinstance(p, str) else "{" + p["param"] + "}" for p in rule["path"]))
        for key in ("query", "pathValues"):
            require(rule[key]["additionalProperties"] is False, "Unbounded request fields")
        if "body" in rule:
            require(rule["body"]["additionalProperties"] is False, "Unbounded body")
    require(actual == ROUTES, "Route expansion or obsolete endpoint")
    create = next(p for p in permissions if p["id"] == "create-playlist")["body"]
    for key in ("public", "collaborative"):
        require(key in create["required"] and create["properties"][key] == {"type": "boolean", "enum": [False]}, "Playlist must be private and noncollaborative")
    package = read(root / "package.json")
    require(package["private"] is True and package["type"] == "module" and package["engines"]["node"] == ">=24", "Wrong worker packaging")
    require(not any(package.get(key) for key in ("dependencies", "devDependencies", "optionalDependencies")), "Unexpected dependency")
    fixtures = root / "test/host-contract"
    lock = read(fixtures / "contract-lock.json")
    require(lock["apiVersion"] == 1 and re.fullmatch(r"[a-f0-9]{40}", lock["sourceCommit"]), "Missing host commit pin")
    require(set(lock["files"]) == {"manifest.schema.json", "protocol.json"}, "Wrong contract inventory")
    for name, digest in lock["files"].items():
        require(hashlib.sha256((fixtures / name).read_bytes()).hexdigest() == digest, "Host fixture changed without pin update")
    return manifest


if __name__ == "__main__":
    try:
        validate()
    except (ValueError, TypeError, KeyError, OSError):
        print("Spotify manifest checks failed.", file=sys.stderr)
        sys.exit(1)
    print("Spotify manifest checks passed: owner-only tools, exact scopes/routes, private playlists and pinned contract")
