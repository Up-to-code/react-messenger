import type * as T from "./types";
import { buildAgentHistory } from "./agent-history.ts";
import { readOrder } from "./commerce.ts";
export function currentOrderMessages(
  messages: T.Message[],
  read: typeof readOrder = readOrder,
) {
  return messages.map((message) => {
    if (message.productCard?.type !== "order-summary") return message;
    const order = read(message.productCard.order.id);
    return order
      ? { ...message, productCard: { ...message.productCard, order } }
      : message;
  });
}
export function archiveMessages(messages: T.Message[]) {
  return currentOrderMessages(messages)
    .filter(
      (message) =>
        !["failed", "queued", "stopped", "thinking", "streaming"].includes(
          message.status || "",
        ),
    )
    .flatMap((message) => {
      const history = buildAgentHistory([message]);
      return history.map((row) => ({ ...row, timestamp: message.timestamp }));
    });
}
