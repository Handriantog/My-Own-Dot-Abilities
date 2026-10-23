import { createProtocol } from "./protocol.mjs";
import { dispatchTool } from "./commands.mjs";
createProtocol({
  input: process.stdin,
  output: process.stdout,
  invoke: dispatchTool,
});
process.on("uncaughtException", () => process.exit(1));
process.on("unhandledRejection", () => process.exit(1));
