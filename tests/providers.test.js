import test from "node:test";
import assert from "node:assert/strict";
import { createAgentResponse } from "../src/lib/agent-server.js";
import { readNDJSON } from "../src/lib/stream.js";
import { agentConfig } from "../src/lib/agent-config.js";
const input = {
  locale: "ar",
  messages: [{ id: "user-1", role: "user", text: "اعرض الخيارات" }],
};
const collect = async (response) => {
  const events = [];
  for await (const event of readNDJSON(response.body)) events.push(event);
  return events;
};
function sse(events) {
  return new Response(
    events.map((event) => "data: " + JSON.stringify(event) + "\n\n").join("") +
      "data: [DONE]\n\n",
  );
}
test("OpenRouter streams text and fragmented validated presentation calls", async () => {
  let payload, url;
  const events = await collect(
    createAgentResponse(input, {
      backend: "openrouter",
      apiKey: "test-only",
      model: "provider/model",
      fetchImpl: async (u, o) => {
        url = u;
        payload = JSON.parse(o.body);
        return sse([
          { choices: [{ delta: { content: "شوف الاختيارات" } }] },
          {
            choices: [
              {
                delta: {
                  tool_calls: [
                    {
                      index: 0,
                      function: { name: "show_", arguments: '{"productIds":' },
                    },
                  ],
                },
              },
            ],
          },
          {
            choices: [
              {
                delta: {
                  tool_calls: [
                    {
                      index: 0,
                      function: { name: "products", arguments: '["phone"]}' },
                    },
                  ],
                },
                finish_reason: "tool_calls",
              },
            ],
          },
        ]);
      },
    }),
  );
  assert.equal(url, "https://openrouter.ai/api/v1/chat/completions");
  assert.equal(payload.model, "provider/model");
  assert.equal(payload.tools[0].function.name, "create_poll");
  assert.equal(
    events.find((e) => e.type === "card").card.productIds[0],
    "phone",
  );
  assert.equal(events.at(-1).type, "done");
  assert.equal(JSON.stringify(events).includes("test-only"), false);
});
test("OpenRouter fails explicitly for incomplete, failed and invalid tool streams", async () => {
  for (const upstream of [
    sse([{ choices: [{ delta: { content: "partial" } }] }]),
    sse([{ error: { message: "private provider error" } }]),
    sse([
      {
        choices: [
          {
            delta: {
              tool_calls: [
                {
                  index: 0,
                  function: {
                    name: "show_products",
                    arguments: '{"productIds":["invented"]}',
                  },
                },
              ],
            },
            finish_reason: "tool_calls",
          },
        ],
      },
    ]),
  ]) {
    const events = await collect(
      createAgentResponse(input, {
        backend: "openrouter",
        apiKey: "test",
        model: "test",
        fetchImpl: async () => upstream,
      }),
    );
    assert.equal(events.at(-1).type, "error");
    assert.equal(
      events.some((e) => e.type === "done"),
      false,
    );
  }
});
test("CrewAI output is validated before rendering and uses authenticated private service", async () => {
  let sent;
  const events = await collect(
    createAgentResponse(input, {
      backend: "crewai",
      serviceURL: "http://127.0.0.1:8008",
      serviceToken: "service-secret",
      fetchImpl: async (u, o) => {
        assert.equal(String(u), "http://127.0.0.1:8008/chat");
        sent = JSON.parse(o.body);
        assert.equal(o.headers.Authorization, "Bearer service-secret");
        return Response.json({
          messages: ["أهلًا", "اختار ما يناسبك"],
          actions: [
            {
              name: "show_choices",
              arguments: {
                question: "ما أولويتك؟",
                options: ["السعر", "الأداء"],
                multiple: true,
              },
            },
          ],
        });
      },
    }),
  );
  assert.equal(sent.locale, "ar");
  assert.equal(events.filter((e) => e.type === "message_start").length, 1);
  assert.equal(
    events.find((e) => e.type === "card").card.type,
    "action-choice",
  );
  assert.equal(events.at(-1).type, "done");
  const invalid = await collect(
    createAgentResponse(input, {
      backend: "crewai",
      serviceURL: "http://127.0.0.1:8008",
      serviceToken: "test",
      fetchImpl: async () =>
        Response.json({
          messages: ["Do not display"],
          actions: [{ name: "place_real_order", arguments: {} }],
        }),
    }),
  );
  assert.equal(
    invalid.some((e) => e.type === "delta"),
    false,
  );
  assert.equal(invalid.at(-1).type, "error");
});
test("backend selection never silently falls back after partial configuration", async () => {
  assert.equal(agentConfig({}).mode, "demo");
  assert.equal(agentConfig({ OPENROUTER_API_KEY: "x" }).mode, "unavailable");
  assert.equal(
    agentConfig({
      AGENT_BACKEND: "crewai",
      CREWAI_SERVICE_URL: "http://localhost:8008",
      CREWAI_SERVICE_TOKEN: "x",
    }).mode,
    "live",
  );
  const events = await collect(
    createAgentResponse(input, agentConfig({ AGENT_BACKEND: "openrouter" })),
  );
  assert.equal(events.at(-1).type, "error");
  assert.equal(
    events.some((e) => e.mode === "demo"),
    false,
  );
});
