import type * as T from "../src/lib/types";
import test from "node:test";
import assert from "node:assert/strict";
import {
  openThreadStore,
  saveThread,
  readThread,
  threadSummary,
  archivedContext,
  listThreads,
} from "../src/lib/thread-store.ts";
import { resolvePresentationTool as resolveTool } from "../src/lib/agent-tools.ts";
test("SQLite archives entire threads, updates by stable ID and isolates owners", () => {
  const db = openThreadStore(":memory:");
  const messages: T.ArchivedMessage[] = Array.from({ length: 650 }, (_, i) => ({
    id: `message-${i}`,
    role: i % 2 ? "assistant" : "user",
    text: i === 0 ? "I need a phone for photography" : "message " + i,
    timestamp: i,
  }));
  saveThread(db, "owner-a", {
    id: "agent-a",
    title: "Photography",
    messages: messages.slice(0, 500),
  });
  saveThread(db, "owner-a", {
    id: "agent-a",
    title: "Photography",
    messages: messages.slice(500),
  });
  assert.equal(threadSummary(db, "owner-a", "agent-a").count, 650);
  assert.equal(readThread(db, "owner-b", "agent-a").length, 0);
  assert.equal(listThreads(db, "owner-b").length, 0);
  saveThread(db, "owner-a", {
    id: "agent-a",
    title: "Photography",
    messages: [
      { ...messages[0], text: "Product choice: Orbit Phone; confirmed: true" },
    ],
  });
  assert.equal(threadSummary(db, "owner-a", "agent-a").count, 650);
  const context = archivedContext(db, "owner-a", "agent-a", [
    { id: "new-prompt", role: "user", text: "What did I choose?" },
  ]);
  assert.equal(context[0].id, "message-0");
  assert.match(context[0].text, /Product choice/);
  assert.equal(context.at(-1)!.id, "new-prompt");
  db.close();
});
test("situational choices and polls have distinct validated schemas", () => {
  const call = (name: string, args: unknown) =>
    resolvePresentationTool({
      type: "function_call",
      name,
      arguments: JSON.stringify(args),
    });
  assert.equal(
    call("create_poll", { question: "Vote?", options: ["A", "B"] }).type,
    "poll",
  );
  assert.equal(
    call("show_choices", {
      question: "Choose?",
      options: ["A", "B"],
      multiple: true,
    }).card!.type,
    "action-choice",
  );
  assert.throws(() =>
    call("show_choices", {
      question: "Choose?",
      options: ["A", "A"],
      multiple: true,
    }),
  );
  assert.throws(() =>
    call("show_choices", { question: "Choose?", options: ["A", "B"] }),
  );
});

test("archive references are readable but cannot reopen missing rich selections", () => {
  const call = (name: string) => ({
    type: "function_call",
    name,
    arguments: JSON.stringify({ messageId: "old-choice" }),
  });
  assert.equal(
    resolvePresentationTool(call("reference_message"), ["old-choice"], "ar", [
      "new-choice",
    ]).type,
    "reference",
  );
  assert.throws(() =>
    resolvePresentationTool(
      call("collect_order_details"),
      ["old-choice"],
      "ar",
      ["new-choice"],
    ),
  );
});

function resolvePresentationTool(...args: Parameters<typeof resolveTool>) {
  const value = resolveTool(...args);
  return {
    ...value,
    card: value.type === "card" ? value.card : undefined,
    messageId: value.type === "reference" ? value.messageId : undefined,
  };
}
