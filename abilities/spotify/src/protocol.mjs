import { TextDecoder } from "node:util";

const MAX_BYTES = 1024 * 1024;
const codes = new Set([
  "permission_denied",
  "setup_needed",
  "host_unavailable",
  "unsupported_platform",
  "timeout",
  "invalid_response",
  "rate_limited",
  "provider_error",
  "busy",
  "cancelled",
]);
const idValid = (v) =>
  typeof v === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(v);
const record = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const keys = (v, required, optional = []) =>
  record(v) &&
  required.every((k) => Object.hasOwn(v, k)) &&
  Object.keys(v).every((k) => required.includes(k) || optional.includes(k));
const values = (v) => record(v) && Object.keys(v).every((k) => k.length <= 64);
export function bounded(value) {
  const pending = [{ value, depth: 0 }];
  let nodes = 0;
  while (pending.length) {
    const { value: item, depth } = pending.pop();
    if (++nodes > 20000 || depth > 24) return false;
    if (item && typeof item === "object")
      for (const child of Object.values(item))
        pending.push({ value: child, depth: depth + 1 });
  }
  return true;
}
export function validReply(value) {
  if (
    keys(value, ["ok", "code"]) &&
    value.ok === false &&
    codes.has(value.code)
  )
    return true;
  if (
    !keys(value, ["ok", "kind", "status", "headers", "body"]) ||
    value.ok !== true ||
    value.kind !== "https"
  )
    return false;
  return (
    Number.isInteger(value.status) &&
    value.status >= 100 &&
    value.status <= 599 &&
    keys(value.headers, [], ["contentType", "retryAfter"]) &&
    (value.headers.contentType === undefined ||
      (typeof value.headers.contentType === "string" &&
        value.headers.contentType.length <= 128)) &&
    (value.headers.retryAfter === undefined ||
      (typeof value.headers.retryAfter === "string" &&
        value.headers.retryAfter.length <= 64)) &&
    typeof value.body === "string" &&
    Buffer.byteLength(value.body) <= MAX_BYTES
  );
}

// One process serves one invocation. Independent broker calls may be interleaved.
export function createProtocol({ input, output, invoke }) {
  let buffer = Buffer.alloc(0);
  let initialized = false;
  let invoked = false;
  let closed = false;
  let active;
  let sequence = 0;
  let frames = 0;
  let timer;
  const seen = new Set();
  const pending = new Map();
  const write = (message) => {
    if (closed) return false;
    const frame = JSON.stringify(message) + "\n";
    if (
      Buffer.byteLength(frame) > MAX_BYTES ||
      output.writableLength > MAX_BYTES ||
      ++frames > 2048
    ) {
      close();
      return false;
    }
    output.write(frame);
    return true;
  };
  const abort = () => {
    active?.controller.abort();
    for (const { reject } of pending.values()) reject(new Error("Cancelled"));
    pending.clear();
    clearTimeout(timer);
  };
  function close() {
    if (closed) return;
    closed = true;
    abort();
    input.removeListener("data", onData);
    input.pause();
    buffer = Buffer.alloc(0);
    output.end();
  }
  const capability = (params) =>
    new Promise((resolve, reject) => {
      if (
        closed ||
        !active ||
        active.controller.signal.aborted ||
        pending.size >= 16
      ) {
        reject(new Error("Unavailable"));
        return;
      }
      const id = `cap-${++sequence}`;
      pending.set(id, { resolve, reject });
      write({ jsonrpc: "2.0", id, method: "capability", params });
    });
  const receive = (m) => {
    if (!bounded(m) || !record(m) || m.jsonrpc !== "2.0") return close();
    if (
      m.method === "shutdown" &&
      keys(m, ["jsonrpc", "method", "params"]) &&
      keys(m.params, [])
    )
      return close();
    if (
      m.method === "cancel" &&
      keys(m, ["jsonrpc", "method", "params"]) &&
      keys(m.params, ["id"]) &&
      idValid(m.params.id)
    ) {
      if (active?.id === m.params.id) {
        abort();
        write({
          jsonrpc: "2.0",
          id: active.id,
          result: { status: "error", code: "cancelled" },
        });
      }
      return;
    }
    if (!idValid(m.id)) return close();
    if (keys(m, ["jsonrpc", "id", "result"])) {
      const request = pending.get(m.id);
      if (!request || !validReply(m.result)) return close();
      pending.delete(m.id);
      request.resolve(m.result);
      return;
    }
    if (!keys(m, ["jsonrpc", "id", "method", "params"]) || seen.has(m.id))
      return close();
    seen.add(m.id);
    if (
      m.method === "initialize" &&
      !initialized &&
      keys(m.params, ["apiVersion"]) &&
      m.params.apiVersion === 1
    ) {
      initialized = true;
      write({ jsonrpc: "2.0", id: m.id, result: { apiVersion: 1 } });
      return;
    }
    if (
      m.method !== "invoke" ||
      !initialized ||
      invoked ||
      !keys(m.params, ["tool", "arguments", "settings"], ["selection"]) ||
      typeof m.params.tool !== "string" ||
      !/^[a-z][a-z0-9-]{0,63}$/.test(m.params.tool.replaceAll("_", "-")) ||
      !values(m.params.arguments) ||
      !values(m.params.settings) ||
      (m.params.selection !== undefined && !values(m.params.selection))
    )
      return close();
    invoked = true;
    active = { id: m.id, controller: new AbortController() };
    const deadline = Date.now() + 55000;
    timer = setTimeout(() => {
      abort();
      write({ jsonrpc: "2.0", id: m.id, result: { status: "uncertain" } });
    }, 55000);
    Promise.resolve()
      .then(() =>
        invoke(m.params, {
          capability,
          signal: active.controller.signal,
          deadline,
        }),
      )
      .then(
        (result) => {
          if (!closed && !active.controller.signal.aborted)
            write({ jsonrpc: "2.0", id: m.id, result });
        },
        () => {
          if (!closed && !active.controller.signal.aborted)
            write({
              jsonrpc: "2.0",
              id: m.id,
              result: { status: "error", code: "provider_error" },
            });
        },
      )
      .finally(abort);
  };
  function onData(chunk) {
    if (closed) return;
    const incoming = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    // Process each line before retaining the trailing fragment; bound that fragment too.
    let start = 0;
    for (let index = 0; index < incoming.length && !closed; index++) {
      if (incoming[index] !== 10) continue;
      const part = incoming.subarray(start, index);
      if (buffer.length + part.length > MAX_BYTES) return close();
      const line = Buffer.concat([buffer, part]);
      buffer = Buffer.alloc(0);
      try {
        receive(
          JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(line)),
        );
      } catch {
        close();
      }
      start = index + 1;
    }
    if (!closed) {
      const rest = incoming.subarray(start);
      if (buffer.length + rest.length > MAX_BYTES) return close();
      buffer = Buffer.concat([buffer, rest]);
    }
  }
  input.on("data", onData);
  input.once("end", close);
  input.once("error", close);
  output.once("error", close);
  return { close };
}
