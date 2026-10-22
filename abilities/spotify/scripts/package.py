#!/usr/bin/env python3
"""Deterministic, dependency-free source packaging. This script never publishes."""
import argparse
import gzip
import hashlib
import io
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys
import tarfile

sys.dont_write_bytecode = True
from check_manifest import validate

ROOT = Path(__file__).resolve().parents[1]
ALLOWLIST = ["ability.json", "LICENSE", "README.md", "SETUP.md", "PRIVACY.md", "TERMS.md", "VERIFICATION.md", "CHANGELOG.md"] + [
    "src/" + name + ".mjs" for name in ["worker", "protocol", "spotify", "errors", "inputs", "resolve", "queries", "targets", "playback", "library", "dispatch"]
]
SECRET = re.compile(rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bghp_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{30,}|(?:access_token|refresh_token|client_secret)\s*[:=]\s*[\"'][A-Za-z0-9_./+~-]{20,}[\"']", re.I)

def git(*arguments):
    return subprocess.run(["git", *arguments], cwd=ROOT, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout.decode().strip()

def encode(value):
    return (json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False) + "\n").encode()

def package(output, development=False, asset_id=None):
    if not development and (asset_id is None or not 0 < asset_id <= 9007199254740991):
        raise ValueError("Release metadata needs the actual GitHub archive asset ID; use --development for offline checks.")
    dirty = bool(git("status", "--porcelain", "--untracked-files=all", "--", "."))
    if dirty and not development:
        raise ValueError("Release source must be clean and committed.")
    commit = git("rev-parse", "HEAD")
    if not re.fullmatch(r"[a-f0-9]{40}", commit):
        raise ValueError("Invalid source commit.")
    files = {}
    for name in ALLOWLIST:
        path = ROOT / name
        for parent in [path, *path.parents]:
            if parent == ROOT:
                break
            if parent.is_symlink():
                raise ValueError("Symlink package input is forbidden.")
        info = path.stat(follow_symlinks=False)
        if not stat.S_ISREG(info.st_mode) or info.st_size > 1024 * 1024 or info.st_nlink != 1:
            raise ValueError("Unsafe package source.")
        data = path.read_bytes()
        if SECRET.search(data):
            raise ValueError("Potential credential in package source; inspect locally.")
        files[name] = data
    manifest = validate(ROOT)
    if not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+", manifest["version"]):
        raise ValueError("Unsupported package version.")
    if "MIT License" not in files["LICENSE"].decode():
        raise ValueError("Package license missing.")
    inventory = {"kind": "development" if development else "release", "sourceCommit": commit, "dirty": dirty,
                 "files": {name: {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()} for name, data in sorted(files.items())}}
    files["package-inventory.json"] = encode(inventory)
    archive = io.BytesIO()
    with tarfile.open(fileobj=archive, mode="w", format=tarfile.USTAR_FORMAT) as tar:
        for name, data in sorted(files.items()):
            entry = tarfile.TarInfo(name)
            entry.mode, entry.mtime, entry.uid, entry.gid = 0o644, 0, 0, 0
            entry.size = len(data)
            tar.addfile(entry, io.BytesIO(data))
    compressed = io.BytesIO()
    with gzip.GzipFile(filename="", fileobj=compressed, mode="wb", mtime=0, compresslevel=9) as zipped:
        zipped.write(archive.getvalue())
    data = compressed.getvalue()
    stem = "spotify-" + manifest["version"]
    name = stem + ".dot-ability.tar.gz"
    descriptor = {"formatVersion": 1, "manifest": manifest, "sourceCommit": commit,
                  "releaseTag": "spotify/" + ("development-" + commit[:12] if development else "v" + manifest["version"]),
                  "asset": {"id": 1 if development else asset_id, "name": name, "sha256": hashlib.sha256(data).hexdigest(),
                            "compressedBytes": len(data), "extractedBytes": sum(map(len, files.values())), "fileCount": len(files)}}
    output.mkdir(parents=True, exist_ok=True)
    if output.is_symlink():
        raise ValueError("Symlink output directory is forbidden.")
    for filename, content in [(name, data), (stem + ".json", encode(descriptor))]:
        path = output / filename
        # Exclusive creation avoids following existing files/symlinks or replacing owner data.
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "wb") as stream:
            stream.write(content)
    print(json.dumps({"kind": inventory["kind"], "sourceCommit": commit, "sha256": descriptor["asset"]["sha256"], "files": len(files)}))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--development", action="store_true")
    parser.add_argument("--asset-id", type=int)
    args = parser.parse_args()
    try:
        package(args.output, args.development, args.asset_id)
    except ValueError as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
    except (OSError, KeyError, TypeError, subprocess.CalledProcessError):
        print("Package creation failed; check source files, Git revision and output location.", file=sys.stderr)
        sys.exit(1)
