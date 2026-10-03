import { buildAgentHistory } from "./agent-history.js";
import { readOrder } from "./commerce.js";
export function currentOrderMessages(messages, read = readOrder) {
  return messages.map((message) => {
    if (message.productCard?.type !== "order-summary") return message;
    const order = read(message.productCard.order.id);
    return order
      ? { ...message, productCard: { ...message.productCard, order } }
      : message;
  });
}
export function archiveMessages(messages) {
  return currentOrderMessages(messages)
    .filter(
      (message) =>
        !["failed", "queued", "stopped", "thinking", "streaming"].includes(
          message.status,
        ),
    )
    .flatMap((message) => {
      const history = buildAgentHistory([message]);
      return history.map((row) => ({ ...row, timestamp: message.timestamp }));
    });
}
