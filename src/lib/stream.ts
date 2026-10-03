import type { AgentEvent, ProviderFrame } from "./types";
// Streaming parsers share the same framing in server and browser tests.
export async function* readLines(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += done
        ? decoder.decode()
        : decoder.decode(value, { stream: true });
      let index;
      while ((index = buffer.indexOf("\n")) !== -1) {
        yield buffer.slice(0, index).replace(/\r$/, "");
        buffer = buffer.slice(index + 1);
      }
      if (done) break;
    }
    if (buffer) yield buffer;
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
export async function* readSSE(body: ReadableStream<Uint8Array>) {
  let data = [];
  for await (const line of readLines(body)) {
    if (line === "") {
      if (data.length) {
        const payload = data.join("\n");
        if (payload !== "[DONE]") yield JSON.parse(payload) as ProviderFrame;
        data = [];
      }
    } else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  }
  if (data.length && data.join("\n") !== "[DONE]")
    yield JSON.parse(data.join("\n")) as ProviderFrame;
}
export async function* readNDJSON(body: ReadableStream<Uint8Array>) {
  for await (const line of readLines(body))
    if (line.trim()) yield JSON.parse(line) as AgentEvent;
}
