import test from "node:test";
import assert from "node:assert/strict";
import { readNDJSON, readSSE } from "../src/lib/stream.js";
import { createAgentResponse, demoAnswer } from "../src/lib/agent-server.js";
import { POST } from "../src/app/api/agent/route.js";

function chunks(text, size = 3) {
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream({
    start(controller) {
      for (let i = 0; i < bytes.length; i += size)
        controller.enqueue(bytes.slice(i, i + size));
      controller.close();
    },
  });
}
test("stream framing preserves Arabic split across UTF-8 byte boundaries", async () => {
  const events = [];
  for await (const event of readNDJSON(
    chunks(JSON.stringify({ type: "delta", text: "مرحبا" }) + "\n"),
  ))
    events.push(event);
  assert.equal(events[0].text, "مرحبا");
  const sse = [];
  for await (const event of readSSE(
    chunks('event: message\r\ndata: {"text":"مرحبا"}\r\n\r\ndata: [DONE]\n\n'),
  ))
    sse.push(event);
  assert.equal(sse[0].text, "مرحبا");
});
test("live adapter forwards text deltas without exposing provider credentials", async () => {
  let sent;
  const response = createAgentResponse(
    { locale: "en", messages: [{ role: "user", text: "Hello" }] },
    {
      apiKey: "test-secret",
      model: "test-model",
      fetchImpl: async (url, options) => {
        sent = { url, options };
        return new Response(
          chunks(
            'data: {"type":"response.output_text.delta","delta":"Hello!"}\n\ndata: {"type":"response.completed"}\n\n',
          ),
        );
      },
    },
  );
  const text = await response.text();
  assert.match(text, /Hello!/);
  assert.match(text, /"type":"done"/);
  assert.doesNotMatch(text, /test-secret/);
  assert.equal(JSON.parse(sent.options.body).store, false);
  assert.equal(sent.options.headers.Authorization, "Bearer test-secret");
});
test("provider errors and incomplete streams become explicit retryable events", async () => {
  for (const upstream of [
    new Response("bad", { status: 401 }),
    new Response(
      chunks(
        'data: {"type":"response.output_text.delta","delta":"Partial"}\n\n',
      ),
    ),
  ]) {
    const response = createAgentResponse(
      { locale: "en", messages: [{ role: "user", text: "Hi" }] },
      {
        apiKey: "test-secret",
        model: "test-model",
        fetchImpl: async () => upstream,
      },
    );
    assert.match(await response.text(), /"type":"error"/);
  }
});
test("canceling the client stream aborts the provider request", async () => {
  let upstreamSignal;
  const response = createAgentResponse(
    { locale: "en", messages: [{ role: "user", text: "Hi" }] },
    {
      apiKey: "test-secret",
      model: "test-model",
      fetchImpl: async (_, options) => {
        upstreamSignal = options.signal;
        return new Promise((_, reject) =>
          options.signal.addEventListener("abort", () =>
            reject(new Error("aborted")),
          ),
        );
      },
    },
  );
  const reader = response.body.getReader();
  await reader.read();
  await reader.cancel();
  assert.equal(upstreamSignal.aborted, true);
});
test("API route rejects foreign origins, invalid payloads, and excessive body sizes", async () => {
  const request = (body, headers = {}) =>
    new Request("http://localhost:3127/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
  assert.equal(
    (await POST(request({}, { origin: "https://elsewhere.example" }))).status,
    403,
  );
  assert.equal(
    (
      await POST(
        request(
          {},
          { host: "127.0.0.1:3127", origin: "http://127.0.0.1:3127" },
        ),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await POST(
        request({ locale: "en", messages: [{ role: "system", text: "bad" }] }),
      )
    ).status,
    400,
  );
  assert.equal(
    (await POST(request({}, { "content-length": "999999999" }))).status,
    413,
  );
});
test("demo replies are language-aware and do not pretend to inspect images", () => {
  assert.match(demoAnswer("ساعدني في كتابة رسالة", "ar"), /لمين الرسالة/);
  assert.match(demoAnswer("Image", "en", true), /do not analyze/);
});

test("demo letter flow asks for context before offering a draft", () => {
  const first = demoAnswer("Help me write a letter", "en");
  assert.match(first, /Who’s it for/);
  const second = demoAnswer("My colleague", "en", false, [
    { role: "assistant", text: first },
  ]);
  assert.match(second, /What do you want the message to say/);
  assert.match(
    demoAnswer("the meeting", "en", false, [
      { role: "assistant", text: second },
    ]),
    /the meeting/,
  );
});

test("a new poll topic takes priority over an earlier letter question", () => {
  assert.match(
    demoAnswer("Coffee or tea?", "en", false, [
      { role: "assistant", text: "Who’s it for?" },
    ]),
    /pick coffee/,
  );
});

test("live presentation function calls render a validated product card", async () => {
  let sent;
  const response = createAgentResponse(
    {
      locale: "en",
      messages: [{ id: "user-1", role: "user", text: "Show products" }],
    },
    {
      apiKey: "test-secret",
      model: "test-model",
      fetchImpl: async (_, options) => {
        sent = JSON.parse(options.body);
        return new Response(
          chunks(
            'data: {"type":"response.output_item.done","item":{"type":"function_call","call_id":"card-1","name":"show_products","arguments":"{\\"productIds\\":[\\"phone\\",\\"tablet\\"]}"}}\n\ndata: {"type":"response.completed"}\n\n',
          ),
        );
      },
    },
  );
  const events = [];
  for await (const event of readNDJSON(response.body)) events.push(event);
  assert.equal(
    events.find((event) => event.type === "card").card.type,
    "products",
  );
  assert.ok(events.some((event) => event.type === "done"));
  assert.equal(sent.parallel_tool_calls, false);
});

test("live multi-message tools preserve ordered boundaries", async () => {
  const item = {
    type: "function_call",
    call_id: "parts",
    name: "send_chat_messages",
    arguments: JSON.stringify({ messages: ["First part", "Second part"] }),
  };
  const upstream = `data: ${JSON.stringify({ type: "response.output_item.done", item })}\n\ndata: {"type":"response.completed"}\n\n`;
  const response = createAgentResponse(
    { locale: "en", messages: [{ id: "user", role: "user", text: "Help" }] },
    {
      apiKey: "mock",
      model: "mock",
      fetchImpl: async () => new Response(chunks(upstream)),
    },
  );
  const events = [];
  for await (const event of readNDJSON(response.body)) events.push(event);
  assert.deepEqual(
    events.filter((event) => ["delta", "message_start"].includes(event.type)),
    [
      { type: "delta", text: "First part" },
      { type: "message_start" },
      { type: "delta", text: "Second part" },
    ],
  );
});
