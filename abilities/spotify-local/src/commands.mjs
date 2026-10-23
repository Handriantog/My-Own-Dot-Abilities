const simple = new Set([
  "play",
  "pause",
  "next",
  "previous",
  "playlists",
  "save_current",
]);
const native = new Set([
  "play",
  "pause",
  "next",
  "previous",
  "volume",
  "seek",
  "shuffle",
  "repeat",
  "play_uri",
]);
const record = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const exact = (v, required, optional = []) =>
  record(v) &&
  required.every((k) => Object.hasOwn(v, k)) &&
  Object.keys(v).every((k) => required.includes(k) || optional.includes(k));
const text = (v, max) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;
function uri(value) {
  if (typeof value !== "string" || value.length > 2048) return;
  if (/^spotify:(track|album|playlist):[A-Za-z0-9]{22}$/.test(value))
    return value;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "open.spotify.com" ||
      url.port ||
      url.username ||
      url.password ||
      url.hash ||
      [...url.searchParams.keys()].some((k) => k !== "si")
    )
      return;
    const match = /^\/(track|album|playlist)\/([A-Za-z0-9]{22})$/.exec(
      url.pathname,
    );
    if (match) return `spotify:${match[1]}:${match[2]}`;
  } catch {}
}
function command(tool, args, selection) {
  if (tool === "play") {
    if (!exact(args, [], ["uri"])) return;
    const selected = args.uri ?? selection?.uri;
    if (selected !== undefined) {
      const target = uri(selected);
      return target ? { action: "play_uri", uri: target } : undefined;
    }
    return { action: "play" };
  }
  if (simple.has(tool)) return exact(args, []) ? { action: tool } : undefined;
  if (tool === "volume")
    return exact(args, ["percent"]) &&
      Number.isInteger(args.percent) &&
      args.percent >= 0 &&
      args.percent <= 100
      ? { action: tool, ...args }
      : undefined;
  if (tool === "seek")
    return exact(args, ["seconds"]) &&
      Number.isFinite(args.seconds) &&
      args.seconds >= 0 &&
      args.seconds <= 86400
      ? { action: tool, ...args }
      : undefined;
  if (tool === "shuffle" || tool === "repeat")
    return exact(args, ["enabled"]) && typeof args.enabled === "boolean"
      ? { action: tool, ...args }
      : undefined;
  if (tool === "search")
    return exact(args, ["query", "category"]) &&
      text(args.query, 200) &&
      ["tracks", "playlists"].includes(args.category)
      ? { action: tool, query: args.query.trim(), category: args.category }
      : undefined;
  if (tool === "create_playlist")
    return exact(args, ["name"]) && text(args.name, 100)
      ? { action: tool, name: args.name.trim() }
      : undefined;
  if (tool === "add_to_playlist") {
    if (!exact(args, ["query"], ["playlistName"]) || !text(args.query, 200))
      return;
    const playlistName = args.playlistName ?? selection?.playlistName;
    if (playlistName !== undefined && !text(playlistName, 100)) return;
    const trackUri =
      selection?.uri === undefined ? undefined : uri(selection.uri);
    if (selection?.uri !== undefined && !trackUri?.startsWith("spotify:track:"))
      return;
    if (!trackUri)
      return { action: "search", query: args.query.trim(), category: "tracks" };
    if (!playlistName) return { action: "playlists" };
    return {
      action: tool,
      query: args.query.trim(),
      trackUri,
      playlistName: playlistName.trim(),
    };
  }
}
export async function dispatchTool(params, context) {
  const request = command(params.tool, params.arguments, params.selection);
  if (!request || !exact(params.settings, []))
    return { status: "error", code: "permission_denied" };
  if (context.signal.aborted) return { status: "error", code: "cancelled" };
  let reply;
  try {
    reply = await context.capability({
      kind: "app-control",
      ruleId: native.has(request.action) ? "playback" : "library-ui",
      command: request,
    });
  } catch {
    return { status: "uncertain" };
  }
  if (context.signal.aborted) return { status: "uncertain" };
  if (!reply.ok) return { status: "error", code: reply.code };
  if (
    reply.kind !== "app-control" ||
    !["success", "uncertain"].includes(reply.status)
  )
    return { status: "uncertain" };
  if (reply.status === "uncertain") return { status: "uncertain" };
  let result = reply.result;
  if (params.tool === "add_to_playlist" && result?.kind === "list") {
    const trackUri = uri(params.selection?.uri);
    const playlistName =
      params.arguments.playlistName ?? params.selection?.playlistName;
    result = {
      ...result,
      items: result.items.map((item) => {
        if (!item.action) return item;
        const target = uri(item.action.uri ?? trackUri);
        const playlist = item.action.playlistName ?? playlistName;
        return {
          ...item,
          action: {
            ...(target ? { uri: target } : {}),
            ...(text(playlist, 100) ? { playlistName: playlist.trim() } : {}),
          },
        };
      }),
    };
  }
  const selection =
    result?.kind === "list" &&
    result.items.some((item) => item.action !== undefined);
  return {
    status: selection ? "selection_needed" : "success",
    ...(result ? { owner: result } : {}),
  };
}
