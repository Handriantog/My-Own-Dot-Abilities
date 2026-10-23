import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  cp,
  mkdir,
  writeFile,
  readFile,
  rm,
  symlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
const source = new URL("../", import.meta.url);
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "spotify-package-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(source, join(root, "abilities/spotify"), {
    recursive: true,
    filter: (path) => !String(path).includes("__pycache__"),
  });
  const git = (...args) =>
    execFileSync(
      "git",
      [
        "-c",
        "commit.gpgsign=false",
        "-c",
        "user.name=Fixture",
        "-c",
        "user.email=fixture@example.invalid",
        ...args,
      ],
      { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
    )
      .toString()
      .trim();
  git("init", "-q");
  git("add", "abilities");
  git("commit", "-qm", "Fixture source");
  const ability = join(root, "abilities/spotify");
  const pack = (name, args = ["--development"]) =>
    spawnSync(
      "python3",
      [
        join(ability, "scripts/package.py"),
        "--output",
        join(root, name),
        ...args,
      ],
      { cwd: root, encoding: "utf8" },
    );
  return { root, ability, git, pack };
}
function success(result) {
  assert.equal(result.status, 0, result.stderr);
}
async function files(root, out = "one") {
  return {
    descriptor: JSON.parse(
      await readFile(join(root, out, "spotify-0.1.0.json")),
    ),
    archive: await readFile(
      join(root, out, "spotify-0.1.0.dot-ability.tar.gz"),
    ),
  };
}
test("archive is deterministic, includes only allowlisted source/licenses and matches its descriptor/inventory", async (t) => {
  const f = await fixture(t);
  await writeFile(join(f.ability, ".env"), "SECRET=not-for-archive");
  await mkdir(join(f.ability, "node_modules"));
  await writeFile(
    join(f.ability, "node_modules/accident.txt"),
    "not-for-archive",
  );
  success(f.pack("one"));
  success(f.pack("two"));
  const one = await files(f.root),
    two = await files(f.root, "two");
  assert.deepEqual(one.archive, two.archive);
  assert.equal(one.descriptor.sourceCommit, f.git("rev-parse", "HEAD"));
  assert.match(one.descriptor.releaseTag, /^spotify\/development-/);
  assert.equal(
    one.descriptor.asset.sha256,
    createHash("sha256").update(one.archive).digest("hex"),
  );
  assert.equal(one.descriptor.asset.compressedBytes, one.archive.length);
  const listing = JSON.parse(
    execFileSync("python3", [
      "-c",
      'import json,sys,tarfile; t=tarfile.open(sys.argv[1]); print(json.dumps({m.name:{"size":m.size,"mode":m.mode,"data":t.extractfile(m).read().decode()} for m in t}))',
      join(f.root, "one/spotify-0.1.0.dot-ability.tar.gz"),
    ]).toString(),
  );
  assert.equal(Object.keys(listing).length, one.descriptor.asset.fileCount);
  assert.equal(
    Object.values(listing).reduce((sum, v) => sum + v.size, 0),
    one.descriptor.asset.extractedBytes,
  );
  assert.deepEqual(
    JSON.parse(listing["ability.json"].data),
    one.descriptor.manifest,
  );
  assert.match(listing.LICENSE.data, /MIT License/);
  assert.ok(listing["src/worker.mjs"]);
  assert.equal(
    Object.keys(listing).some((name) =>
      /test|node_modules|\.env|__pycache__|scripts/.test(name),
    ),
    false,
  );
  const inventory = JSON.parse(listing["package-inventory.json"].data);
  assert.equal(inventory.kind, "development");
  assert.equal(inventory.sourceCommit, one.descriptor.sourceCommit);
  for (const [name, item] of Object.entries(listing)) {
    assert.equal(item.mode, 0o644);
    if (name === "package-inventory.json") continue;
    assert.equal(
      inventory.files[name].sha256,
      createHash("sha256").update(item.data).digest("hex"),
    );
    assert.equal(inventory.files[name].bytes, item.size);
  }
});
test("release packaging requires a real asset ID, clean committed source and the actual source commit", async (t) => {
  const f = await fixture(t);
  assert.notEqual(f.pack("missing", []).status, 0);
  success(f.pack("one", ["--asset-id", "12345"]));
  assert.equal((await files(f.root)).descriptor.releaseTag, "spotify/v0.1.0");
  await writeFile(join(f.ability, "src/worker.mjs"), "// Uncommitted source");
  const dirty = f.pack("dirty", ["--asset-id", "12345"]);
  assert.notEqual(dirty.status, 0);
  assert.match(dirty.stderr, /committed|clean/i);
  success(f.pack("development"));
});
test("unverified platforms, symlinks, source credentials and missing entrypoints fail closed", async (t) => {
  for (const mutation of ["platform", "symlink", "secret", "missing"]) {
    const f = await fixture(t);
    const worker = join(f.ability, "src/worker.mjs");
    if (mutation === "platform") {
      const manifest = JSON.parse(
        await readFile(join(f.ability, "ability.json")),
      );
      manifest.platforms = ["linux-x64"];
      await writeFile(
        join(f.ability, "ability.json"),
        JSON.stringify(manifest),
      );
    } else if (mutation === "symlink") {
      await rm(worker);
      await symlink("errors.mjs", worker);
    } else if (mutation === "secret")
      await writeFile(worker, `const secret = 'ghp_${"A".repeat(36)}';`);
    else await rm(worker);
    const result = f.pack("one");
    assert.notEqual(result.status, 0, mutation);
    assert.equal(result.stderr.includes("ghp_"), false);
  }
});
