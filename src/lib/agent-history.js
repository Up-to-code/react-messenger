import { cardContext, selectionText, normalizeFilters } from "./products.js";
import { MY_USER_ID } from "./messages.js";

export function buildAgentHistory(messages) {
  let imageCount = 0;
  const eligible = messages.filter(
    (item) =>
      (item.message || item.attachment || item.productCard || item.poll) &&
      !["failed", "queued", "stopped"].includes(item.status),
  );
  const choice = [...eligible]
    .reverse()
    .find((item) => item.productCard?.selection);
  const preferences = [...eligible]
    .reverse()
    .find((item) => item.interaction?.method === "filterProducts");
  const order = [...eligible]
    .reverse()
    .find((item) => item.productCard?.type === "order-summary");
  const recent = eligible.slice(-20);
  const memories = [choice, preferences, order]
    .filter(
      (item) => item && !recent.some((recentItem) => recentItem.id === item.id),
    )
    .map((item) => ({
      id: item.id,
      role: item.author === MY_USER_ID ? "user" : "assistant",
      text: `Saved conversation memory:\n${item.interaction?.method === "filterProducts" ? `Product preferences: ${JSON.stringify(normalizeFilters(item.interaction.payload.filters))}` : cardContext(item.productCard)}`.slice(
        0,
        1000,
      ),
    }));
  let remainingText =
    40000 - memories.reduce((total, item) => total + item.text.length, 0);
  const history = eligible
    .filter((item) => !memories.some((memory) => memory.id === item.id))
    .slice(-(20 - memories.length))
    .reverse()
    .map((item) => {
      const details = [
        item.id ? `[Message ID: ${item.id}]` : "",
        item.reply?.id ? `[Reply to: ${item.reply.id}]` : "",
        item.forwarded
          ? `[Forwarded from conversation ${item.forwarded.conversationId}, message ${item.forwarded.messageId}]`
          : "",
        item.interaction?.sourceId
          ? `[Choice responding to: ${item.interaction.sourceId}; method: ${item.interaction.method}]`
          : "",
        cardContext(item.productCard),
        item.poll
          ? `Poll: ${item.poll.question}; options: ${item.poll.options.map((o) => o.label).join(" / ")}; vote: ${item.poll.options.find((o) => o.id === item.poll.vote)?.label || "none"}`
          : "",
        item.interaction?.payload?.selection
          ? selectionText(item.interaction.payload.selection, "en")
          : "",
      ]
        .filter(Boolean)
        .join("\n");
      const raw = (item.message || "") + (details ? `\n\n${details}` : "");
      const quote = item.reply ? `Quoted message: ${item.reply.text}\n\n` : "";
      const text = (
        quote.slice(0, Math.max(0, 10000 - raw.length)) + raw
      ).slice(0, Math.min(10000, remainingText));
      remainingText -= text.length;
      const image =
        item.author === MY_USER_ID && item.attachment && ++imageCount <= 2
          ? item.attachment.url
          : null;
      return {
        ...(item.id ? { id: item.id } : {}),
        role: item.author === MY_USER_ID ? "user" : "assistant",
        text,
        ...(image ? { image } : {}),
      };
    })
    .reverse()
    .filter((item) => item.text || item.image);
  return [...memories, ...history];
}
