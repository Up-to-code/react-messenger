import type * as T from "../src/lib/types";
import {
  deliveryDates,
  automaticDeliveryDate,
} from "../src/lib/business-policy.ts";
import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeCustomer,
  normalizeOrder,
  quoteSelection,
} from "../src/lib/commerce.ts";
import { cardContext, resolveContextualCard } from "../src/lib/products.ts";
const selection: T.Selection = {
  productId: "phone",
  variant: "256 GB",
  color: "purple",
  colors: ["purple", "blue"],
  delivery: "express",
  extras: ["case", "charger"],
  stage: 4,
};
const customer: T.Customer = {
  name: "عميل تجريبي",
  phone: "01000000000",
  city: "القاهرة",
  address: "عنوان تجريبي فقط",
  date: automaticDeliveryDate("express"),
  slot: "evening",
};
const order: T.OrderDraft = {
  id: "demo-order",
  sourceId: "source-1",
  status: "draft",
  createdAt: Date.now(),
  selection,
  customer,
};
test("commerce quotes recompute prices and validate customer appointments", () => {
  assert.equal(quoteSelection(selection).total, 1363);
  assert.equal(quoteSelection(selection).quantity, 2);
  assert.deepEqual(normalizeCustomer(customer, "express"), customer);
  for (const patch of [
    { phone: "invalid" },
    { phone: "-------" },
    { address: "" },
    { date: "2020-01-01" },
    { date: "2099-02-30" },
    { slot: "anything" },
  ])
    assert.throws(() =>
      normalizeCustomer({ ...customer, ...patch }, "express"),
    );
  assert.equal(
    normalizeCustomer({ ...customer, city: "", address: "" }, "pickup").city,
    "",
  );
  assert.equal(
    normalizeOrder({ ...order, quote: { total: 1 } }).quote.total,
    1363,
  );
  assert.equal(
    normalizeOrder({
      ...order,
      status: "confirmed",
      customer: { ...customer, date: "2020-01-01" },
    }).status,
    "confirmed",
  );
});
test("order context excludes customer details and requires a valid selection source", () => {
  const context = cardContext({
    type: "order-summary",
    order: normalizeOrder(order),
  });
  for (const field of ["name", "phone", "address", "city"] as const)
    assert.equal(context.includes(customer[field]), false);
  assert.equal(
    resolveContextualCard({ type: "order-request", messageId: "source-1" }, [
      {
        id: "source-1",
        author: "agent",
        message: "",
        timestamp: 0,
        productCard: { type: "confirmed", selection },
      },
    ]).type,
    "order-details",
  );
  assert.throws(() =>
    resolveContextualCard({ type: "order-request", messageId: "missing" }, []),
  );
});

test("automatic dates follow preparation, cutoff and business calendar", () => {
  const now = new Date("2026-10-04T08:00:00Z");
  assert.equal(automaticDeliveryDate("standard", now), "2026-10-06");
  assert.equal(
    automaticDeliveryDate("express", new Date("2026-10-08T16:00:00Z")),
    "2026-10-11",
  );
  assert.equal(deliveryDates("standard", now).includes("2026-10-09"), false);
});
