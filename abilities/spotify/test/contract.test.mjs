import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = new URL("../", import.meta.url);
const json = async (path) =>
  JSON.parse(await readFile(new URL(path, root), "utf8"));
const scopes = [
  "user-read-playback-state",
  "user-read-currently-playing",
  "user-modify-playback-state",
  "playlist-read-private",
  "playlist-modify-private",
  "user-library-modify",
];
const routes = {
  search: ["GET", "v1/search"],
  playback: ["GET", "v1/me/player"],
  devices: ["GET", "v1/me/player/devices"],
  "currently-playing": ["GET", "v1/me/player/currently-playing"],
  play: ["PUT", "v1/me/player/play"],
  transfer: ["PUT", "v1/me/player"],
  pause: ["PUT", "v1/me/player/pause"],
  next: ["POST", "v1/me/player/next"],
  previous: ["POST", "v1/me/player/previous"],
  queue: ["POST", "v1/me/player/queue"],
  volume: ["PUT", "v1/me/player/volume"],
  playlists: ["GET", "v1/me/playlists"],
  playlist: ["GET", "v1/playlists/{playlistId}"],
  "create-playlist": ["POST", "v1/me/playlists"],
  "add-items": ["POST", "v1/playlists/{playlistId}/items"],
  "save-tracks": ["PUT", "v1/me/library"],
};
test("declares exactly eleven owner-only tools and six Spotify scopes", async () => {
  const manifest = await json("ability.json");
  assert.equal(manifest.tools.length, 11);
  assert.deepEqual(
    manifest.tools.map((t) => t.id).sort(),
    [
      "search",
      "playback",
      "play",
      "pause",
      "skip",
      "queue",
      "volume",
      "playlists",
      "create_playlist",
      "add_to_playlist",
      "save_tracks",
    ].sort(),
  );
  assert(
    manifest.tools.every(
      (tool) => tool.visibility === "owner-only" && tool.output.type === "null",
    ),
  );
  assert.deepEqual(manifest.helpers, []);
  assert.deepEqual(manifest.platforms, ["darwin-arm64"]);
  assert.deepEqual(manifest.entrypoint, {
    runtime: "javascript",
    path: "src/worker.mjs",
  });
  const oauth = manifest.permissions.filter(
    (permission) => permission.kind === "oauth",
  );
  assert.equal(oauth.length, 1);
  assert.deepEqual(oauth[0].scopes.toSorted(), scopes.toSorted());
  assert.equal(
    oauth[0].authorizationUrl,
    "https://accounts.spotify.com/authorize",
  );
  assert.equal(oauth[0].tokenUrl, "https://accounts.spotify.com/api/token");
  assert.equal(oauth[0].resourceOrigin, "https://api.spotify.com");
  assert.equal(manifest.permissions.length, 17);
  assert(
    manifest.permissions.every((p) => ["https", "oauth"].includes(p.kind)),
  );
});
test("limits broker routes, request shapes and private playlist creation", async () => {
  const manifest = await json("ability.json");
  const permissions = manifest.permissions.filter(
    (permission) => permission.kind === "https",
  );
  assert.deepEqual(
    Object.fromEntries(
      permissions.map((p) => [
        p.id,
        [
          p.method,
          p.path
            .map((s) => (typeof s === "string" ? s : `{${s.param}}`))
            .join("/"),
        ],
      ]),
    ),
    routes,
  );
  for (const p of permissions) {
    assert.equal(p.origin, "https://api.spotify.com");
    assert.equal(p.account, "spotify-account");
    assert.equal(p.query.additionalProperties, false);
    assert.equal(p.pathValues.additionalProperties, false);
    if (p.body?.type === "object")
      assert.equal(p.body.additionalProperties, false);
  }
  const create = permissions.find((p) => p.id === "create-playlist").body;
  for (const key of ["public", "collaborative"]) {
    assert(create.required.includes(key));
    assert.deepEqual(create.properties[key], {
      type: "boolean",
      enum: [false],
    });
  }
  assert.equal(
    permissions.find((p) => p.id === "search").query.properties.limit.maximum,
    10,
  );
  assert.equal(
    permissions.find((p) => p.id === "add-items").body.properties.uris.maxItems,
    40,
  );
});
test("pins public host schema and wire fixtures without a host runtime dependency", async () => {
  const lock = await json("test/host-contract/contract-lock.json");
  assert.equal(lock.apiVersion, 1);
  assert.equal(lock.sourceCommit, "9024a2e4efa644ac97533c91a663b8a335d65a4b");
  for (const [name, hash] of Object.entries(lock.files)) {
    assert.match(name, /^(manifest\.schema\.json|protocol\.json)$/);
    const bytes = await readFile(new URL("test/host-contract/" + name, root));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), hash);
  }
  assert.equal(Object.keys(lock.files).length, 2);
  const pkg = await json("package.json");
  assert.equal(pkg.private, true);
  assert.equal(pkg.type, "module");
  assert.equal(pkg.engines.node, ">=24");
  for (const field of [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
  ])
    assert.deepEqual(pkg[field] || {}, {});
});

test("restricts Spotify to typed commands and embeds exact pre-install provider notices", async () => {
  const manifest = await json("ability.json");
  assert(
    manifest.tools.every(
      (tool) => JSON.stringify(tool.channels) === '["text"]',
    ),
  );
  assert.deepEqual(
    manifest.notices.map(({ id, required }) => ({ id, required })),
    [
      { id: "terms", required: true },
      { id: "privacy", required: false },
    ],
  );
  assert.equal(
    manifest.notices[0].text,
    await readFile(new URL("TERMS.md", root), "utf8"),
  );
  assert.equal(
    manifest.notices[1].text,
    await readFile(new URL("PRIVACY.md", root), "utf8"),
  );
});
