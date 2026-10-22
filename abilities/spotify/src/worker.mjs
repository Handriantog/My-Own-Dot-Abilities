import { createProtocol } from "./protocol.mjs";

// Tool dispatch is supplied by the following implementation task. Fail closed.
createProtocol({
  input: process.stdin,
  output: process.stdout,
  invoke: async () => ({ status: "error", code: "setup_needed" }),
});
process.on("uncaughtException", () => process.exit(1));
process.on("unhandledRejection", () => process.exit(1));
