import type * as T from "./types";
import { demoConversations } from "./demo.ts";
import { splitOptionsMessage } from "./agent-parts.ts";
import { normalizeProductCard } from "./products.ts";
const ID = /^[a-zA-Z0-9_-]{1,100}$/;
export function normalizeStoredChat(
  value: T.StoredChat | null,
): T.Conversation[] | null {
  if (
    !value ||
    value.version !== 1 ||
    !Array.isArray(value.conversations) ||
    value.conversations.length > 100
  )
    return null;
  const seen = new Set<string>();
  const conversations: T.Conversation[] = value.conversations.map(
    (conversation) => {
      if (
        !ID.test(conversation.id) ||
        seen.has(conversation.id) ||
        typeof conversation.name !== "string" ||
        !Array.isArray(conversation.messages)
      )
        throw new Error("Invalid stored conversation");
      seen.add(conversation.id);
      const ids = new Set<string>();
      const messages = conversation.messages.slice(-500).map((message) => {
        if (
          !ID.test(message.id) ||
          ids.has(message.id) ||
          !["apple", "orange", "agent"].includes(message.author) ||
          typeof message.message !== "string" ||
          message.message.length > 20000 ||
          !Number.isFinite(message.timestamp)
        )
          throw new Error("Invalid stored message");
        ids.add(message.id);
        const seeded = demoConversations
          .find((item) => item.id === conversation.id)
          ?.messages.find(
            (item) =>
              item.id === message.id && item.message === message.message,
          );
        const safe = {
          ...message,
          ...(seeded ? { messageKey: seeded.messageKey } : {}),
          motion: false,
        };
        if (safe.productCard)
          safe.productCard = normalizeProductCard(safe.productCard);
        if (["thinking", "streaming"].includes(safe.status || ""))
          safe.status = "stopped";
        return safe;
      });
      return {
        ...conversation,
        name: conversation.name.slice(0, 80),
        nameAr:
          demoConversations.find((item) => item.id === conversation.id)
            ?.nameAr || conversation.nameAr,
        kind:
          conversation.id === "agent" ||
          /^agent-[a-zA-Z0-9_-]+$/.test(conversation.id)
            ? "agent"
            : undefined,
        typing: false,
        messages: messages
          .flatMap((message) => {
            if (
              !["options", "filters"].includes(message.productCard?.type || "")
            )
              return [message];
            const priorChoice = [...messages]
              .reverse()
              .find(
                (item) =>
                  item.interaction?.method === "selectProduct" &&
                  item.interaction.sourceId === message.id,
              )?.interaction?.payload?.selection;
            const source = priorChoice
              ? {
                  ...message,
                  productCard: normalizeProductCard({
                    ...message.productCard,
                    selection: priorChoice,
                  }),
                }
              : message;
            return splitOptionsMessage(source, (suffix) => {
              let candidate = `${message.id.slice(0, 80)}_${suffix}`;
              let count = 1;
              while (ids.has(candidate))
                candidate = `${message.id.slice(0, 80)}_${suffix}_${count++}`;
              ids.add(candidate);
              return candidate;
            });
          })
          .slice(-500),
      };
    },
  );
  return conversations.length &&
    conversations.some((item) => item.id === "agent") &&
    conversations.some((item) => item.id === "contact-1")
    ? conversations
    : null;
}
export function openChatDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("messages-local-memory", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("chats");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Storage blocked"));
  });
}
export function readChatDatabase(database: IDBDatabase) {
  return new Promise<T.StoredChat | null>((resolve, reject) => {
    const request = database
      .transaction("chats", "readonly")
      .objectStore("chats")
      .get("current");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export function writeChatDatabase(
  database: IDBDatabase,
  conversations: T.Conversation[],
) {
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction("chats", "readwrite");
    transaction
      .objectStore("chats")
      .put({ version: 1, conversations }, "current");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
