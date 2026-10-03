import test from "node:test";
import assert from "node:assert/strict";
import { chatReducer, validPoll } from "../src/lib/chat-state.js";
import { buildAgentHistory } from "../src/lib/agent-history.js";
import { normalizeAgentInput } from "../src/lib/agent-input.js";

const seed = () => [
  {
    id: "one",
    messages: [
      {
        id: "m",
        message: "Hi",
        poll: {
          question: "Tea?",
          options: [
            { id: "yes", label: "Yes" },
            { id: "no", label: "No" },
          ],
          vote: null,
        },
      },
    ],
  },
  { id: "two", messages: [] },
];
test("streaming, delivery, reactions, and votes update only the intended message", () => {
  const initial = seed();
  let next = chatReducer(initial, {
    type: "delta",
    conversationId: "one",
    messageId: "m",
    text: " there",
  });
  next = chatReducer(next, {
    type: "patch",
    conversationId: "one",
    messageId: "m",
    patch: { status: "delivered" },
  });
  next = chatReducer(next, {
    type: "react",
    conversationId: "one",
    messageId: "m",
    emoji: "❤️",
  });
  next = chatReducer(next, {
    type: "vote",
    conversationId: "one",
    messageId: "m",
    optionId: "yes",
  });
  assert.equal(next[0].messages[0].message, "Hi there");
  assert.equal(next[0].messages[0].status, "delivered");
  assert.equal(next[0].messages[0].poll.vote, "yes");
  assert.equal(initial[0].messages[0].poll.vote, null);
  assert.equal(next[1], initial[1]);
  next = chatReducer(next, {
    type: "react",
    conversationId: "one",
    messageId: "m",
    emoji: "❤️",
  });
  next = chatReducer(next, {
    type: "vote",
    conversationId: "one",
    messageId: "m",
    optionId: "yes",
  });
  assert.equal(next[0].messages[0].reaction, null);
  assert.equal(next[0].messages[0].poll.vote, null);
});
test("polls require two distinct non-empty options and support Arabic", () => {
  assert.equal(validPoll("ماذا نفعل؟", ["قهوة", "نزهة"]), true);
  assert.equal(validPoll("?", ["Tea", " tea "]), false);
  assert.equal(validPoll("?", ["Tea", ""]), false);
  assert.equal(validPoll(" ", ["Tea", "Coffee"]), false);
});
test("agent input rejects injected roles, remote image URLs, and oversized histories", () => {
  const body = { locale: "ar", messages: [{ role: "user", text: "مرحبًا" }] };
  assert.equal(normalizeAgentInput(body).messages[0].text, "مرحبًا");
  assert.throws(() =>
    normalizeAgentInput({
      ...body,
      messages: [{ role: "system", text: "injected" }],
    }),
  );
  assert.throws(() =>
    normalizeAgentInput({
      ...body,
      messages: [
        { role: "user", text: "hi", image: "https://example.com/image.png" },
      ],
    }),
  );
  assert.throws(() =>
    normalizeAgentInput({
      ...body,
      messages: Array(41).fill({ role: "user", text: "hi" }),
    }),
  );
});

test("long histories preserve the latest user prompt within API limits", () => {
  const history = buildAgentHistory(
    Array.from({ length: 25 }, (_, i) => ({
      author: i % 2 === 0 ? "apple" : "agent",
      message: String(i).padEnd(10000, "x"),
      status: "sent",
    })),
  );
  assert.ok(history.length <= 20);
  assert.ok(
    history.reduce((total, item) => total + item.text.length, 0) <= 40000,
  );
  assert.equal(history.at(-1).text.length, 10000);
  assert.equal(history.at(-1).role, "user");
  assert.equal(
    normalizeAgentInput({ locale: "en", messages: history }).messages.length,
    history.length,
  );
});
