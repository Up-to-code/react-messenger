import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveProductInteraction,
  validSelection,
  normalizeProductCard,
} from "../src/lib/products.js";
import {
  resolvePresentationTool,
  presentationTools,
} from "../src/lib/agent-tools.js";
import { normalizeStoredChat } from "../src/lib/chat-storage.js";
import { buildAgentHistory } from "../src/lib/agent-history.js";
const selection = {
  productId: "phone",
  variant: "256 GB",
  color: "blue",
  delivery: "express",
  extras: ["case"],
  stage: 3,
};
test("selection methods validate products and keep choice state distinct from polls", () => {
  const result = resolveProductInteraction("confirmSelection", { selection });
  assert.equal(result.card.type, "confirmed");
  assert.equal(result.card.selection.stage, 4);
  assert.deepEqual(selection.extras, ["case"]);
  assert.equal(
    validSelection({ ...selection, variant: "imaginary size" }),
    false,
  );
  assert.equal(
    validSelection({ ...selection, extras: ["case", "case"] }),
    false,
  );
  assert.throws(() => resolveProductInteraction("poll", { selection }));
  assert.throws(() =>
    normalizeProductCard({
      type: "selection",
      selection: { ...selection, productId: "unknown" },
    }),
  );
});
test("provider presentation tools reject unknown products and message references", () => {
  assert.equal(presentationTools(["source"]).length, 10);
  const call = (name, args) => ({
    type: "function_call",
    name,
    arguments: JSON.stringify(args),
  });
  assert.equal(
    resolvePresentationTool(call("show_products", { productIds: ["phone"] }))
      .card.type,
    "products",
  );
  assert.equal(
    resolvePresentationTool(
      call("choose_product_options", { productId: "phone" }),
    ).card.type,
    "options",
  );
  assert.throws(() =>
    resolvePresentationTool(
      call("choose_product_options", { productId: "unknown" }),
    ),
  );
  assert.throws(() =>
    resolvePresentationTool(call("show_products", { productIds: ["other"] })),
  );
  assert.throws(() =>
    resolvePresentationTool(
      call("reference_message", { messageId: "foreign" }),
      ["source"],
    ),
  );
  assert.equal(
    resolvePresentationTool(
      call("reference_message", { messageId: "source" }),
      ["source"],
    ).messageId,
    "source",
  );
});
test("restored memory preserves IDs and choices but stops interrupted streams", () => {
  const conversations = [
    {
      id: "agent",
      name: "Noor",
      messages: [
        {
          id: "choice",
          author: "agent",
          message: "Your choice",
          timestamp: 1,
          status: "complete",
          productCard: { type: "confirmed", selection },
        },
        {
          id: "partial",
          author: "agent",
          message: "Partial",
          timestamp: 2,
          status: "streaming",
          motion: true,
        },
      ],
    },
    { id: "contact-1", name: "Sandra", messages: [] },
  ];
  const result = normalizeStoredChat({ version: 1, conversations });
  assert.equal(result[0].messages[0].id, "choice");
  assert.equal(result[0].messages[0].productCard.selection.color, "blue");
  assert.equal(result[0].messages[1].status, "stopped");
  assert.equal(result[0].messages[1].motion, false);
  assert.equal(conversations[0].messages[1].status, "streaming");
  assert.throws(() =>
    normalizeStoredChat({
      version: 1,
      conversations: [...conversations, conversations[0]],
    }),
  );
});
test("provider transcript contains source IDs and structured selection context", () => {
  const history = buildAgentHistory([
    {
      id: "forwarded",
      author: "apple",
      message: "My choice",
      forwarded: { conversationId: "contact-1", messageId: "original" },
      productCard: { type: "selection", selection },
      status: "sent",
    },
  ]);
  assert.equal(history[0].id, "forwarded");
  assert.match(history[0].text, /message original/);
  assert.match(history[0].text, /256 GB/);
  assert.match(history[0].text, /Blue/);
});

test("an earlier product choice is retained outside the recent-message window", () => {
  const source = {
    id: "old-choice",
    author: "agent",
    message: "Chosen",
    timestamp: 1,
    productCard: { type: "confirmed", selection },
    status: "complete",
  };
  const recent = Array.from({ length: 24 }, (_, i) => ({
    id: `recent-${i}`,
    author: i === 23 ? "apple" : "agent",
    message: i === 23 ? "What did I choose?" : "Another topic",
    status: "sent",
  }));
  const history = buildAgentHistory([source, ...recent]);
  assert.equal(history.length, 20);
  assert.equal(history[0].id, "old-choice");
  assert.match(history[0].text, /256 GB/);
  assert.equal(history.at(-1).role, "user");
});

test("legacy combined options restore as three independent messages without ID collisions", () => {
  const id = "x".repeat(100);
  const original = {
    id,
    author: "agent",
    message: "",
    timestamp: 1,
    status: "complete",
    productCard: { type: "options", productId: "phone" },
  };
  const result = normalizeStoredChat({
    version: 1,
    conversations: [
      { id: "agent", name: "Noor", messages: [original] },
      { id: "contact-1", name: "Sandra", messages: [] },
    ],
  });
  const parts = result[0].messages;
  assert.deepEqual(
    parts.map((part) => part.productCard.type),
    ["product-detail", "variant", "color"],
  );
  assert.equal(parts[0].id, id);
  assert.equal(new Set(parts.map((part) => part.id)).size, 3);
  assert.ok(
    parts.every(
      (part) => part.id.length <= 100 && part.productCard.groupId === id,
    ),
  );
  assert.deepEqual(
    normalizeStoredChat({ version: 1, conversations: result }),
    result,
  );
});

test("product filtering intersects price, type, size, colors and any selected collections", async () => {
  const { filterCatalog, normalizeFilters } =
    await import("../src/lib/products.js");
  assert.deepEqual(filterCatalog({ maxPrice: 500 }), ["tablet", "headphones"]);
  assert.deepEqual(
    filterCatalog({ colors: ["purple"], collections: ["work", "travel"] }),
    ["phone"],
  );
  assert.deepEqual(
    filterCatalog({
      types: ["tablet", "headphones"],
      sizes: ["12 inch"],
      collections: ["everyday", "work"],
    }),
    ["tablet"],
  );
  assert.deepEqual(filterCatalog({ maxPrice: 100 }), []);
  assert.throws(() => normalizeFilters({ minPrice: 500, maxPrice: 100 }));
  assert.throws(() => normalizeFilters({ collections: ["invented"] }));
  assert.equal(
    validSelection({ ...selection, colors: ["purple", "blue"] }),
    true,
  );
  assert.equal(
    validSelection({ ...selection, colors: ["blue", "blue"] }),
    false,
  );
});

test("the agent remembers earlier price and collection preferences after other topics", () => {
  const source = {
    id: "preferences",
    author: "apple",
    message: "My preferences",
    status: "delivered",
    interaction: {
      method: "filterProducts",
      sourceId: "options",
      payload: { filters: { maxPrice: 500, collections: ["work", "travel"] } },
    },
  };
  const recent = Array.from({ length: 24 }, (_, index) => ({
    id: `topic-${index}`,
    author: index === 23 ? "apple" : "agent",
    message: "Another topic",
    status: "complete",
  }));
  const history = buildAgentHistory([source, ...recent]);
  assert.equal(history.length, 20);
  assert.equal(history[0].id, "preferences");
  assert.match(history[0].text, /"maxPrice":500/);
  assert.match(history[0].text, /work.*travel/);
});
