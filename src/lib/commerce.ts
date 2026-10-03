import type * as T from "./types";
import { dateInZone, deliveryDates } from "./business-policy.ts";
import { validSelection, requireProduct } from "./products.ts";

export const DELIVERY_PRICES = { standard: 5, express: 15, pickup: 0 };
export const EXTRA_PRICES = { case: 20, charger: 30, care: 40 };
export const ORDER_ID = /^[a-zA-Z0-9_-]{1,100}$/;
export function localDate(date: Date = new Date()) {
  return dateInZone(date);
}
export function normalizeCustomer(
  input: unknown,
  delivery: T.Delivery,
  allowPast: boolean = false,
) {
  if (!input || typeof input !== "object") throw new Error("Invalid customer");
  const value = input as Record<string, unknown>;
  const result: Record<keyof T.Customer, string> = {
    name: "",
    phone: "",
    city: "",
    address: "",
    date: "",
    slot: "",
  };
  for (const [field, max] of Object.entries({
    name: 80,
    phone: 24,
    city: 80,
    address: 240,
    date: 10,
    slot: 20,
  })) {
    const entry = value[field];
    if (typeof entry !== "string" || entry.length > max)
      throw new Error("Invalid customer field");
    result[field as keyof T.Customer] = entry.trim();
  }
  if (
    result.name.length < 2 ||
    !/^\+?[\d ()-]{7,24}$/.test(result.phone) ||
    result.phone.replace(/\D/g, "").length < 7 ||
    (delivery !== "pickup" && (!result.city || result.address.length < 5))
  )
    throw new Error("Missing customer details");
  const parsed = new Date(`${result.date}T12:00:00`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(result.date) ||
    Number.isNaN(parsed.getTime()) ||
    localDate(parsed) !== result.date ||
    (!allowPast && !deliveryDates(delivery).includes(result.date)) ||
    (result.slot !== "morning" &&
      result.slot !== "afternoon" &&
      result.slot !== "evening")
  )
    throw new Error("Invalid appointment");
  return { ...result, slot: result.slot as T.Customer["slot"] };
}
export function quoteSelection(selection: T.Selection): T.Quote {
  if (!validSelection(selection)) throw new Error("Invalid selection");
  const quantity = (selection.colors || [selection.color]).length;
  const subtotal = requireProduct(selection.productId).price * quantity;
  const extras = selection.extras.reduce(
    (sum, id) => sum + EXTRA_PRICES[id],
    0,
  );
  const delivery = DELIVERY_PRICES[selection.delivery];
  return {
    quantity,
    subtotal,
    extras,
    delivery,
    total: subtotal + extras + delivery,
    currency: "USD",
  };
}
export function normalizeOrder(input: unknown): T.Order {
  if (!input || typeof input !== "object") throw new Error("Invalid order");
  const order = input as T.OrderDraft;
  if (
    !order ||
    !ORDER_ID.test(order.id) ||
    !ORDER_ID.test(order.sourceId) ||
    !["draft", "confirmed"].includes(order.status || "") ||
    !validSelection(order.selection) ||
    !Number.isFinite(order.createdAt)
  )
    throw new Error("Invalid order");
  if (
    order.payment &&
    (order.status !== "confirmed" ||
      !["card", "cod"].includes(order.payment.method) ||
      order.payment.status !==
        (order.payment.method === "card" ? "paid" : "pending") ||
      typeof order.payment.reference !== "string" ||
      !/^demo-[a-zA-Z0-9_-]{1,100}$/.test(order.payment.reference) ||
      !Number.isFinite(order.payment.createdAt))
  )
    throw new Error("Invalid demo payment");
  const selection = {
    ...order.selection,
    extras: [...order.selection.extras],
    ...(order.selection.colors ? { colors: [...order.selection.colors] } : {}),
  };
  return {
    id: order.id,
    sourceId: order.sourceId,
    conversationId:
      typeof order.conversationId === "string" &&
      /^agent(?:-[a-zA-Z0-9_-]{1,90})?$/.test(order.conversationId)
        ? order.conversationId
        : "agent",
    status: order.status,
    createdAt: order.createdAt,
    selection,
    customer: normalizeCustomer(order.customer, selection.delivery, true),
    quote: quoteSelection(selection),
    ...(order.payment
      ? {
          payment: {
            status: order.payment.status,
            method: order.payment.method,
            reference: order.payment.reference,
            createdAt: order.payment.createdAt,
          },
        }
      : {}),
  };
}
export function writeOrder(order: T.OrderDraft) {
  const safe = normalizeOrder(order);
  localStorage.setItem(`messages-order-${safe.id}`, JSON.stringify(safe));
  window.dispatchEvent(new Event("messages-order-change"));
  return safe;
}
export function readOrder(id: string) {
  if (!ORDER_ID.test(id)) return null;
  try {
    const raw = localStorage.getItem(`messages-order-${id}`);
    return raw ? normalizeOrder(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}
