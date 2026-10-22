import { PassThrough } from "node:stream";
import { setImmediate as nextTurn } from "node:timers/promises";
import { createProtocol } from "../src/protocol.mjs";

export function fakeHost(invoke) {
  const input = new PassThrough();
  const output = new PassThrough();
  const messages = [];
  let text = "";
  output.on("data", (chunk) => {
    text += chunk.toString();
    let end;
    while ((end = text.indexOf("\n")) !== -1) {
      messages.push(JSON.parse(text.slice(0, end)));
      text = text.slice(end + 1);
    }
  });
  const protocol = createProtocol({ input, output, invoke });
  const send = async (message) => {
    input.write(`${JSON.stringify(message)}\n`);
    await nextTurn();
  };
  return { input, output, messages, send, ...protocol };
}
export const init = {
  jsonrpc: "2.0",
  id: "init",
  method: "initialize",
  params: { apiVersion: 1 },
};
export const invocation = {
  jsonrpc: "2.0",
  id: "invoke",
  method: "invoke",
  params: {
    tool: "search",
    arguments: { query: "synthetic song" },
    settings: {},
  },
};
export const reply = (id, result) => ({ jsonrpc: "2.0", id, result });
