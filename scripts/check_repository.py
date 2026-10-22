#!/usr/bin/env python3
"""Validate the repository index without installing or executing Ability code."""

import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ID = re.compile(r"[a-z][a-z0-9]*(?:-[a-z0-9]+)*")
VERSION = re.compile(r"(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)")


def unique_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"Duplicate JSON key: {key}")
        result[key] = value
    return result


def validate(root):
    errors = []
    catalog = json.loads(
        (root / "catalog.json").read_text(), object_pairs_hook=unique_keys
    )
    if not isinstance(catalog, dict) or set(catalog) != {"catalogVersion", "abilities"}:
        return ["Catalog must contain only catalogVersion and abilities"]
    if type(catalog["catalogVersion"]) is not int or catalog["catalogVersion"] != 1:
        errors.append("Unsupported catalogVersion")
    if not isinstance(catalog["abilities"], list):
        return errors + ["abilities must be an array"]

    ids = set()
    for entry in catalog["abilities"]:
        if not isinstance(entry, dict) or set(entry) != {
            "id", "name", "path", "status", "version", "license"
        }:
            errors.append("Each Ability requires id, name, path, status, version, license")
            continue
        ability_id = entry["id"]
        if not isinstance(ability_id, str) or not ID.fullmatch(ability_id):
            errors.append(f"Invalid Ability ID: {ability_id!r}")
            continue
        if ability_id in ids:
            errors.append(f"Duplicate Ability ID: {ability_id}")
        ids.add(ability_id)
        expected_path = f"abilities/{ability_id}"
        if entry["path"] != expected_path:
            errors.append(f"{ability_id}: path must be {expected_path}")
            continue
        directory = root / expected_path
        if directory.is_symlink() or not directory.is_dir():
            errors.append(f"{ability_id}: directory must exist and not be a symlink")
            continue
        if not isinstance(entry["name"], str) or not entry["name"].strip():
            errors.append(f"{ability_id}: name is required")
        if entry["license"] != "MIT":
            errors.append(f"{ability_id}: original repository content uses MIT")
        if entry["status"] not in ("planned", "development", "released"):
            errors.append(f"{ability_id}: invalid status")
        version = entry["version"]
        if version is not None and (
            not isinstance(version, str) or not VERSION.fullmatch(version)
        ):
            errors.append(f"{ability_id}: version must be null or a stable X.Y.Z version")
        if entry["status"] == "released" and version is None:
            errors.append(f"{ability_id}: released Ability requires a version")
        if entry["status"] == "planned" and version is not None:
            errors.append(f"{ability_id}: planned Ability cannot have a released version")
        for name in ("README.md", "CHANGELOG.md"):
            file = directory / name
            if file.is_symlink() or not file.is_file() or not file.read_text().strip():
                errors.append(f"{ability_id}: {name} must be a nonempty regular file")

    abilities = root / "abilities"
    if abilities.is_symlink() or not abilities.is_dir():
        errors.append("abilities must be a regular directory")
    else:
        directories = {path.name for path in abilities.iterdir() if path.is_dir()}
        if directories != ids:
            errors.append(f"Catalog/directory mismatch: {sorted(directories ^ ids)}")
    license_text = (root / "LICENSE").read_text()
    if "MIT License" not in license_text or "Permission is hereby granted" not in license_text:
        errors.append("Root MIT license is missing or unrecognized")
    return errors


def main():
    try:
        errors = validate(ROOT)
    except (OSError, ValueError, TypeError) as error:
        errors = [str(error)]
    if errors:
        print("Repository checks failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    print("Repository checks passed: catalog, Ability directories, and MIT license")
    return 0


if __name__ == "__main__":
    sys.exit(main())
