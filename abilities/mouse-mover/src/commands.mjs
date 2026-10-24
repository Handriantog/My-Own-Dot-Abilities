import { validReply } from "./protocol.mjs";

const empty = (value) => value !== null && typeof value === "object" &&
  !Array.isArray(value) && Object.keys(value).length === 0;
const messages = {
  inactive: "Mouse Mover is stopped.",
  approaching: "Mouse Mover is approaching the pointer.",
  running: "Mouse Mover is running.",
  paused: "Mouse Mover is paused while you use the mouse. It resumes after five seconds of inactivity.",
};

// The host admits interactive owner turns, owns all movement and sleep assertions,
// and cleans up provisional starts if this invocation fails or loses authority.
export async function dispatchTool(params, context) {
  if (!["start", "stop", "status"].includes(params.tool) ||
      !empty(params.arguments) || !empty(params.settings) || params.selection !== undefined)
    return { status: "error", code: "permission_denied" };
  if (context.signal.aborted) return { status: "error", code: "cancelled" };
  let reply;
  try {
    reply = await context.capability({
      kind: "companion-activity", ruleId: "movement",
      command: { action: params.tool, activityId: "carry-pointer" },
    });
  } catch {
    return { status: "uncertain" };
  }
  if (context.signal.aborted || !validReply(reply)) return { status: "uncertain" };
  if (!reply.ok) return { status: "error", code: reply.code };
  return { status: "success", owner: { kind: "text", text: messages[reply.status] } };
}
