// Offline check against the actual public distribution, never a private source import.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
const { values } = parseArgs({
  options: {
    bundle: { type: "string" },
    artifact: { type: "string" },
    descriptor: { type: "string" },
  },
});
if (!values.bundle || !values.artifact || !values.descriptor)
  throw new Error("--bundle, --artifact and --descriptor are required");
const runtime = createRequire(import.meta.url)(
  resolve(values.bundle, "ability-runtime.cjs"),
);
const descriptorBytes = await readFile(values.descriptor);
const descriptor = runtime.parseReleaseDescriptor(JSON.parse(descriptorBytes));
const bytes = await readFile(values.artifact);
const digest = (data) => createHash("sha256").update(data).digest("hex");
assert.equal(digest(bytes), descriptor.asset.sha256);
const root = await realpath(
  await mkdtemp(join(tmpdir(), "spotify-host-package-")),
);
try {
  const review = {
    id: randomUUID(),
    expiresAt: Date.now() + 60000,
    descriptor,
    descriptorSha256: digest(descriptorBytes),
    descriptorUrl:
      "https://github.com/handriantog/my-own-dot-abilities/releases/download/" +
      encodeURIComponent(descriptor.releaseTag) +
      "/" + descriptor.asset.name.replace(/\.dot-ability\.tar\.gz$/, ".json"),
    archiveUrl:
      "https://api.github.com/repos/handriantog/my-own-dot-abilities/releases/assets/" +
      descriptor.asset.id,
  };
  const installer = new runtime.AbilityInstaller(join(root, "installation"), {
    resolve: async (url) => {
      assert.equal(url, review.descriptorUrl);
      return structuredClone(review);
    },
    download: async (url, limit) => {
      assert.equal(url, review.archiveUrl);
      assert.equal(limit, bytes.length);
      return bytes;
    },
  });
  const pkg = await installer.prepare(review, new AbortController().signal);
  assert.deepEqual(pkg.manifest, descriptor.manifest);
  assert.equal(pkg.files.length, descriptor.asset.fileCount);
  assert.equal(
    JSON.parse(await readFile(join(pkg.root, "package-inventory.json")))
      .sourceCommit,
    descriptor.sourceCommit,
  );
  await readFile(join(pkg.root, "src/worker.mjs"));
  console.log(
    JSON.stringify({
      verified: "production host extraction and sealed package",
      digest: pkg.digest,
      files: pkg.files.length,
    }),
  );
} finally {
  await rm(root, { recursive: true, force: true });
}
