import { createProtocol } from "./protocol.mjs";
import { createSpotifyClient } from "./spotify.mjs";
import { dispatchTool } from "./dispatch.mjs";

createProtocol({
  input: process.stdin,
  output: process.stdout,
  invoke: (params, context) =>
    dispatchTool({
      ...params,
      client: createSpotifyClient(context),
      signal: context.signal,
    }),
});
process.on("uncaughtException", () => process.exit(1));
process.on("unhandledRejection", () => process.exit(1));
