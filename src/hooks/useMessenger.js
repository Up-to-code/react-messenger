import { useThreadArchive } from "./useThreadArchive";
import { currentOrderMessages } from "../lib/thread-memory";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { demoConversations } from "../lib/demo";
import { chatReducer } from "../lib/chat-state";
import { MY_USER_ID } from "../lib/messages";
import { readNDJSON } from "../lib/stream";
import { splitOptionsMessage, waitForPart } from "../lib/agent-parts";
import { buildAgentHistory } from "../lib/agent-history";
import { useChatMemory } from "./useChatMemory";
import {
  resolveProductInteraction,
  resolveContextualCard,
} from "../lib/products";

const initial = [
  {
    id: "agent",
    kind: "agent",
    name: "Noor",
    online: true,
    timestamp: Date.UTC(2026, 9, 3, 19, 28),
    messages: [
      {
        id: "agent-greeting",
        author: "orange",
        message: "Hey! What’s on your mind?",
        messageKey: "greeting",
        timestamp: Date.UTC(2026, 9, 3, 19, 28),
        status: "complete",
      },
    ],
  },
  ...demoConversations.map((item, index) => ({
    ...item,
    online: index % 3 !== 1,
  })),
];

export function useMessenger(online, locale) {
  const [conversations, dispatch] = useReducer(chatReducer, initial);
  const memory = useChatMemory(conversations, dispatch);
  const archiveStatus = useThreadArchive(conversations, memory.ready);
  const [agentMode, setAgentMode] = useState("demo");
  const [activeAgent, setActiveAgent] = useState(null);
  const active = useRef(null);
  const timers = useRef(new Set());
  const scheduled = useRef(new Set());
  const current = useRef(conversations);
  // Event handlers need the latest histories without mutating refs during rendering.
  useEffect(() => {
    current.current = conversations;
  }, [conversations]);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/agent", { signal: controller.signal })
      .then((response) => response.json())
      .then((data) => setAgentMode(data.mode))
      .catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(
    () => () => {
      for (const timer of timers.current) clearTimeout(timer);
      active.current?.controller.abort();
    },
    [],
  );

  const patch = useCallback(
    (conversationId, messageId, value) =>
      dispatch({ type: "patch", conversationId, messageId, patch: value }),
    [],
  );
  const schedule = useCallback((fn, ms) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  }, []);

  const runAgent = useCallback(
    async (conversationId, messages, replyId) => {
      if (active.current) return;
      const controller = new AbortController();
      let cursorId = replyId;
      let hasContent = false;
      let hasOutput = false;
      const promptId = messages.at(-1)?.id;
      active.current = { controller, conversationId, replyId };
      setActiveAgent(conversationId);
      patch(conversationId, replyId, {
        status: "thinking",
        error: false,
        message: "",
        productCard: null,
        turnId: replyId,
      });
      function nextMessage() {
        if (!hasContent) return;
        patch(conversationId, cursorId, { status: "complete" });
        cursorId = crypto.randomUUID();
        hasContent = false;
        active.current.replyId = cursorId;
        dispatch({
          type: "append",
          conversationId,
          message: {
            id: cursorId,
            author: "agent",
            message: "",
            timestamp: Date.now(),
            status: "thinking",
            motion: true,
            promptId,
            turnId: replyId,
          },
        });
      }
      let complete = false;
      try {
        const response = await fetch("/api/agent", {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locale,
            threadId: conversationId,
            messages: buildAgentHistory(currentOrderMessages(messages)),
          }),
        });
        if (!response.ok || !response.body) throw new Error("Request failed");
        for await (const event of readNDJSON(response.body)) {
          if (controller.signal.aborted) break;
          if (event.type === "mode") setAgentMode(event.mode);
          if (event.type === "message_start") nextMessage();
          if (event.type === "delta") {
            dispatch({
              type: "delta",
              conversationId,
              messageId: cursorId,
              text: event.text,
            });
            patch(conversationId, cursorId, { status: "streaming" });
            hasContent = true;
            hasOutput = true;
          }
          if (
            event.type === "reference" &&
            /^[a-zA-Z0-9_-]{1,100}$/.test(event.messageId)
          )
            patch(conversationId, cursorId, { references: [event.messageId] });
          if (event.type === "poll") {
            if (hasContent) nextMessage();
            patch(conversationId, cursorId, {
              poll: event.poll,
              status: "complete",
            });
            hasContent = true;
            hasOutput = true;
          }
          if (event.type === "card") {
            const parts = splitOptionsMessage({
              id: crypto.randomUUID(),
              message: "",
              productCard: resolveContextualCard(event.card, messages),
            });
            for (const part of parts) {
              if (hasContent) {
                await waitForPart(320, controller.signal);
                nextMessage();
              }
              patch(conversationId, cursorId, {
                productCard: part.productCard,
                status: "complete",
              });
              hasContent = true;
              hasOutput = true;
            }
          }
          if (event.type === "error") throw new Error("Stream failed");
          if (event.type === "done") complete = true;
        }
        if (controller.signal.aborted) return;
        if (!complete || !hasOutput) throw new Error("Incomplete reply");
        patch(conversationId, cursorId, { status: "complete" });
      } catch {
        if (!controller.signal.aborted)
          patch(conversationId, cursorId, { status: "failed", error: true });
      } finally {
        if (active.current?.controller === controller) {
          active.current = null;
          setActiveAgent(null);
        }
      }
    },
    [locale, patch],
  );

  const runInteraction = useCallback(
    async (conversationId, message, retryId) => {
      if (active.current) return;
      const controller = new AbortController();
      const rootId = retryId || crypto.randomUUID();
      active.current = { controller, conversationId, replyId: rootId };
      setActiveAgent(conversationId);
      patch(conversationId, message.id, { status: "delivered" });
      const pending = {
        id: rootId,
        author: "agent",
        message: "",
        productCard: null,
        error: false,
        timestamp: Date.now(),
        status: "thinking",
        motion: true,
        promptId: message.id,
        turnId: rootId,
      };
      if (retryId) patch(conversationId, rootId, pending);
      else dispatch({ type: "append", conversationId, message: pending });
      try {
        const result = resolveProductInteraction(
          message.interaction.method,
          message.interaction.payload,
          locale,
        );
        const parts = splitOptionsMessage({
          id: rootId,
          author: "agent",
          message: result.reply,
          productCard: result.card,
          motion: true,
          timestamp: Date.now(),
          status: "complete",
          promptId: message.id,
          turnId: rootId,
        });
        await waitForPart(650, controller.signal);
        for (let i = 0; i < parts.length; i++) {
          if (i) await waitForPart(320, controller.signal);
          const part = { ...parts[i], timestamp: Date.now() };
          active.current.replyId = part.id;
          if (!i) patch(conversationId, rootId, part);
          else dispatch({ type: "append", conversationId, message: part });
        }
      } catch {
        if (!controller.signal.aborted)
          patch(conversationId, active.current.replyId, {
            status: "failed",
            error: true,
          });
      } finally {
        if (active.current?.controller === controller) {
          active.current = null;
          setActiveAgent(null);
        }
      }
    },
    [locale, patch],
  );

  const send = useCallback(
    (conversationId, content) => {
      const conversation = current.current.find(
        (item) => item.id === conversationId,
      );
      if (
        !memory.ready ||
        !conversation ||
        (conversation.kind === "agent" &&
          (active.current ||
            conversation.messages.some((item) => item.status === "queued")))
      )
        return false;
      let interactionResult;
      try {
        if (content.interaction)
          interactionResult = resolveProductInteraction(
            content.interaction.method,
            content.interaction.payload,
            locale,
          );
      } catch {
        return false;
      }
      const message = {
        id: crypto.randomUUID(),
        author: MY_USER_ID,
        message: interactionResult
          ? interactionResult.text
          : content.poll
            ? `${content.poll.question}\n${content.poll.options.map((option) => option.label).join(" / ")}`
            : content.text || "",
        attachment: content.attachment || null,
        reply: content.reply || null,
        forwarded: content.forwarded || null,
        productCard: content.productCard || null,
        interaction: content.interaction || null,
        poll: content.poll || null,
        motion: true,
        timestamp: Date.now(),
        status: online ? "sending" : "queued",
      };
      dispatch({ type: "append", conversationId, message });
      if (interactionResult && online) {
        scheduled.current.add(message.id);
        runInteraction(conversationId, message);
      } else if (conversation.kind === "agent" && online) {
        const replyId = crypto.randomUUID();
        dispatch({
          type: "append",
          conversationId,
          message: {
            id: replyId,
            author: "agent",
            message: "",
            timestamp: Date.now(),
            status: "thinking",
            motion: true,
            promptId: message.id,
          },
        });
        patch(conversationId, message.id, { status: "sent" });
        void runAgent(
          conversationId,
          [...conversation.messages, message],
          replyId,
        );
      }
      return true;
    },
    [online, patch, runAgent, runInteraction, locale, memory.ready],
  );

  useEffect(() => {
    if (!online || !memory.ready) return;
    for (const conversation of conversations) {
      for (const message of conversation.messages.filter(
        (item) =>
          item.author === MY_USER_ID &&
          ["queued", "sending"].includes(item.status),
      )) {
        if (scheduled.current.has(message.id)) continue;
        if (message.interaction) {
          if (active.current) continue;
          scheduled.current.add(message.id);
          runInteraction(conversation.id, message);
          continue;
        }
        if (conversation.kind === "agent") {
          if (active.current) continue;
          scheduled.current.add(message.id);
          patch(conversation.id, message.id, { status: "sent" });
          const replyId = crypto.randomUUID();
          dispatch({
            type: "append",
            conversationId: conversation.id,
            message: {
              id: replyId,
              author: "agent",
              message: "",
              timestamp: Date.now(),
              status: "thinking",
              motion: true,
              promptId: message.id,
            },
          });
          const index = conversation.messages.findIndex(
            (item) => item.id === message.id,
          );
          void runAgent(
            conversation.id,
            conversation.messages
              .slice(0, index + 1)
              .map((item) =>
                item.id === message.id ? { ...item, status: "sent" } : item,
              ),
            replyId,
          );
          continue;
        }
        scheduled.current.add(message.id);
        patch(conversation.id, message.id, { status: "sending" });
        schedule(() => {
          if (!navigator.onLine) {
            scheduled.current.delete(message.id);
            patch(conversation.id, message.id, { status: "queued" });
            return;
          }
          patch(conversation.id, message.id, { status: "sent" });
          schedule(() => {
            if (navigator.onLine)
              patch(conversation.id, message.id, { status: "delivered" });
          }, 500);
          if (conversation.online && !message.poll) {
            schedule(() => {
              if (navigator.onLine)
                dispatch({
                  type: "typing",
                  conversationId: conversation.id,
                  value: true,
                });
            }, 800);
            schedule(() => {
              dispatch({
                type: "typing",
                conversationId: conversation.id,
                value: false,
              });
              if (!navigator.onLine) return;
              patch(conversation.id, message.id, { status: "read" });
              dispatch({
                type: "append",
                conversationId: conversation.id,
                message: {
                  id: crypto.randomUUID(),
                  author: "orange",
                  message:
                    locale === "ar" || /[\u0600-\u06ff]/.test(message.message)
                      ? "تمام، وصلت رسالتك 👍"
                      : "Got it, thanks 👍",
                  timestamp: Date.now(),
                  status: "complete",
                  motion: true,
                },
              });
            }, 2600);
          }
        }, 550);
      }
    }
  }, [
    online,
    conversations,
    locale,
    patch,
    runAgent,
    runInteraction,
    schedule,
    memory.ready,
  ]);

  const stop = useCallback(() => {
    if (!active.current) return;
    const { controller, conversationId, replyId } = active.current;
    controller.abort();
    patch(conversationId, replyId, { status: "stopped" });
    active.current = null;
    setActiveAgent(null);
  }, [patch]);
  const retry = useCallback(
    (conversationId, replyId) => {
      if (!online || active.current) return;
      const conversation = current.current.find(
        (item) => item.id === conversationId,
      );
      const index = conversation.messages.findIndex(
        (item) => item.id === replyId,
      );
      const reply = conversation.messages[index];
      const promptIndex = conversation.messages.findIndex(
        (item) => item.id === reply.promptId,
      );
      if (promptIndex >= 0) {
        const prompt = conversation.messages[promptIndex];
        if (prompt.interaction)
          void runInteraction(conversationId, prompt, replyId);
        else
          void runAgent(
            conversationId,
            conversation.messages.slice(0, promptIndex + 1),
            replyId,
          );
      }
    },
    [online, runAgent, runInteraction],
  );
  return {
    conversations,
    archiveStatus,
    agentMode,
    activeAgent,
    send,
    stop,
    retry,
    dispatch,
    memory,
  };
}
