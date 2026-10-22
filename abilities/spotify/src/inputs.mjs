import manifest from "../ability.json" with { type: "json" };
import { SpotifyFailure } from "./errors.mjs";
const schemas = new Map(manifest.tools.map((tool) => [tool.id, tool.input]));
export const isRecord = (v) =>
  v !== null &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(v));
export const exactKeys = (v, required, optional = []) =>
  isRecord(v) &&
  required.every((key) => Object.hasOwn(v, key)) &&
  Object.keys(v).every(
    (key) => required.includes(key) || optional.includes(key),
  );
export const invalid = () => {
  throw new SpotifyFailure("permission_denied");
};
export function spotifyUri(
  value,
  types = ["track", "album", "artist", "playlist"],
) {
  if (typeof value !== "string") return null;
  const match =
    /^spotify:(track|album|artist|playlist):([A-Za-z0-9]{22})$/.exec(value);
  return match && types.includes(match[1])
    ? { type: match[1], id: match[2], uri: value }
    : null;
}
function validate(schema, value) {
  if (schema.enum && !schema.enum.includes(value)) return false;
  switch (schema.type) {
    case "object":
      return (
        isRecord(value) &&
        Object.keys(value).every(
          (key) =>
            Object.hasOwn(schema.properties, key) &&
            validate(schema.properties[key], value[key]),
        ) &&
        schema.required.every((key) => Object.hasOwn(value, key))
      );
    case "string":
      return (
        typeof value === "string" &&
        value.length >= (schema.minLength ?? 0) &&
        value.length <= schema.maxLength
      );
    case "array":
      return (
        Array.isArray(value) &&
        value.length >= (schema.minItems ?? 0) &&
        value.length <= schema.maxItems &&
        value.every((v) => validate(schema.items, v))
      );
    case "integer":
      return (
        Number.isInteger(value) &&
        value >= schema.minimum &&
        value <= schema.maximum
      );
    case "boolean":
      return typeof value === "boolean";
    case "null":
      return value === null;
    default:
      return false;
  }
}
export function parseToolInput(tool, value) {
  const schema = schemas.get(tool);
  if (!schema || !validate(schema, value)) invalid();
  for (const field of ["query", "artist", "device", "playlistName", "name"])
    if (value[field] !== undefined && value[field].trim().length === 0)
      invalid();
  if (value.types && new Set(value.types).size !== value.types.length)
    invalid();
  if (value.artist && !value.query) invalid();
  if (
    ["query", "uri", "uris"].filter((key) => value[key] !== undefined).length >
    1
  )
    invalid();
  if (
    value.playlistUri !== undefined &&
    !spotifyUri(value.playlistUri, ["playlist"])
  )
    invalid();
  if (value.playlistUri && value.playlistName) invalid();
  if (
    value.uri !== undefined &&
    !spotifyUri(value.uri, tool === "play" ? undefined : ["track"])
  )
    invalid();
  if (value.uris && !value.uris.every((uri) => spotifyUri(uri, ["track"])))
    invalid();
  return structuredClone(value);
}
export function parseSelection(value) {
  if (value === undefined) return undefined;
  if (!isRecord(value) || value.version !== 1) invalid();
  if (
    value.kind === "item" &&
    exactKeys(value, ["version", "kind", "type", "uri"]) &&
    spotifyUri(value.uri)?.type === value.type
  )
    return structuredClone(value);
  if (
    value.kind === "device" &&
    exactKeys(value, ["version", "kind", "id"]) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    value.id.length <= 128
  )
    return structuredClone(value);
  if (
    value.kind === "playlist-page" &&
    exactKeys(value, ["version", "kind", "offset", "limit"]) &&
    Number.isInteger(value.offset) &&
    value.offset >= 0 &&
    value.offset <= 10000 &&
    Number.isInteger(value.limit) &&
    value.limit >= 1 &&
    value.limit <= 10
  )
    return structuredClone(value);
  invalid();
}
