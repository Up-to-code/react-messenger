import type * as T from "./types";
import {
  PRODUCTS,
  COLORS,
  createProductCard,
  FILTER_OPTIONS,
  normalizeFilters,
  filterCatalog,
} from "./products.ts";
const enumIDs = PRODUCTS.map((product) => product.id);
export function presentationTools(
  messageIds: string[] = [],
  actionMessageIds: string[] = messageIds,
): T.FunctionTool[] {
  const productIDs = {
    type: "array",
    items: { type: "string", enum: enumIDs },
  };
  const filterProperties = {
    minPrice: { type: "number" },
    maxPrice: { type: ["number", "null"] },
    ...Object.fromEntries(
      Object.entries(FILTER_OPTIONS).map(([field, options]) => [
        field,
        { type: "array", items: { type: "string", enum: options } },
      ]),
    ),
  };
  const tools: T.FunctionTool[] = [
    {
      type: "function",
      name: "create_poll",
      description:
        "Create a conversational poll with two to five options. Distinct from a product choice or an action chooser.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          question: { type: "string" },
          options: { type: "array", items: { type: "string" } },
        },
        required: ["question", "options"],
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "show_choices",
      description:
        "Show a situational ready UI choice card with radio or checkbox options. Use for priorities, intent, use case or next actions; distinct from voting polls and product variants. The answer continues the conversation.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          question: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          multiple: { type: "boolean" },
        },
        required: ["question", "options", "multiple"],
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "choose_product_filters",
      description:
        "Show separate price, color, size, type and collection messages. Each supports multiple choices, and collections match any selected collection.",
      strict: true,
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "filter_products",
      description:
        "Find matching sample catalog products using price, color, size, type and multiple collections. Empty arrays mean unrestricted; null maxPrice means no upper limit.",
      strict: true,
      parameters: {
        type: "object",
        properties: filterProperties,
        required: Object.keys(filterProperties),
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "send_chat_messages",
      description:
        "Send two to six short chat messages in order, instead of a single long bubble.",
      strict: true,
      parameters: {
        type: "object",
        properties: { messages: { type: "array", items: { type: "string" } } },
        required: ["messages"],
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "show_products",
      description:
        "Display a horizontally scrolling electronics catalog. This is a fictional selection demo, not a checkout.",
      strict: true,
      parameters: {
        type: "object",
        properties: { productIds: productIDs },
        required: ["productIds"],
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "compare_products",
      description: "Show two or three catalog products side by side.",
      strict: true,
      parameters: {
        type: "object",
        properties: { productIds: productIDs },
        required: ["productIds"],
        additionalProperties: false,
      },
    },
  ];
  tools.push({
    type: "function",
    name: "choose_product_options",
    description:
      "Show separate product, size/storage and multi-color check options for a product when the customer asks about available colors or sizing. Do not choose on their behalf.",
    strict: true,
    parameters: {
      type: "object",
      properties: { productId: { type: "string", enum: enumIDs } },
      required: ["productId"],
      additionalProperties: false,
    },
  });
  if (messageIds.length) {
    tools.push({
      type: "function",
      name: "collect_order_details",
      description:
        "Open a local customer details card using an existing product selection message. The customer completes the form and confirms a demo order on its page. Never claim to place a real order.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          messageId: { type: "string", enum: [...new Set(actionMessageIds)] },
        },
        required: ["messageId"],
        additionalProperties: false,
      },
    });
    tools.push({
      type: "function",
      name: "reference_message",
      description:
        "Show a link back to a relevant message in this conversation. Only reference IDs in the provided history.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          messageId: { type: "string", enum: [...new Set(messageIds)] },
        },
        required: ["messageId"],
        additionalProperties: false,
      },
    });
  }
  return tools;
}
export const catalogInstructions = `For a generic request ask one useful question or show_choices for priorities. For a specific request use known constraints directly and skip questions already answered. Use create_poll only when actual voting is requested. Use show_choices for single/multiple situational actions, not a poll. Never collect card numbers, passwords or payment credentials in chat. Interactive catalog is fictional and prices are sample USD amounts. Available products: ${JSON.stringify(PRODUCTS.map(({ id, name, price, variants, feature, colors, type, collections }) => ({ id, name, price, variants, feature, colors, type, collections })))}. Colors: ${COLORS.map((color) => color.en).join(", ")}. Use choose_product_filters when the customer wants to explore price, colors, sizes, types, or multiple collections. Use filter_products to find actual catalog matches for specified criteria. Use send_chat_messages for multiple short conversational parts. Use show_products to display choices or compare_products to compare them. Use choose_product_options when the customer wants colors, storage, size, or fit; it renders a separate choosing surface, not a chat bubble. A presentation tool finishes the turn and is rendered by the client; the next user choice comes back in the transcript. Use collect_order_details to open a focused customer details card from an existing product selection message when the user wants to order. Customer form details stay local; only an order summary enters your context. Confirmation happens explicitly on the local demo order page. Use reference_message to point to an earlier choice or forwarded message by its ID. Do not invent products, confirm orders, or claim to charge money. Do not change a user's size/color selection without their explicit choice.`;
export function resolvePresentationTool(
  item: T.FunctionCall,
  messageIds: string[] = [],
  locale: T.Locale = "en",
  actionMessageIds: string[] = messageIds,
): T.Presentation {
  if (
    item?.type !== "function_call" ||
    typeof item.arguments !== "string" ||
    item.arguments.length > 14000
  )
    throw new Error("Invalid tool call");
  const args = JSON.parse(item.arguments) as {
    question: string;
    options: string[];
    multiple: boolean;
    messages: string[];
    messageId: string;
    productId: string;
    productIds: string[];
  } & T.Filters;
  if (["create_poll", "show_choices"].includes(item.name)) {
    const max = item.name === "create_poll" ? 5 : 6;
    if (
      typeof args.question !== "string" ||
      !args.question.trim() ||
      args.question.length > 240 ||
      !Array.isArray(args.options) ||
      args.options.length < 2 ||
      args.options.length > max ||
      !args.options.every(
        (label) =>
          typeof label === "string" && label.trim() && label.length <= 160,
      ) ||
      new Set(args.options.map((label) => label.trim().toLowerCase())).size !==
        args.options.length
    )
      throw new Error("Invalid choice request");
    const options = args.options.map((label, i) => ({
      id: `option-${i + 1}`,
      label: label.trim(),
    }));
    if (item.name === "create_poll")
      return {
        type: "poll",
        poll: { question: args.question.trim(), options, vote: null },
      };
    if (typeof args.multiple !== "boolean")
      throw new Error("Invalid choice mode");
    return {
      type: "card",
      card: {
        type: "action-choice",
        question: args.question.trim(),
        options,
        multiple: args.multiple,
        selected: [],
      },
    };
  }
  if (
    item.name === "send_chat_messages" &&
    Array.isArray(args.messages) &&
    args.messages.length >= 2 &&
    args.messages.length <= 6 &&
    args.messages.every(
      (text) => typeof text === "string" && text.trim() && text.length <= 2000,
    )
  )
    return {
      type: "messages",
      messages: args.messages.map((text) => text.trim()),
    };
  if (
    item.name === "collect_order_details" &&
    actionMessageIds.includes(args.messageId)
  )
    return {
      type: "card",
      card: { type: "order-request", messageId: args.messageId },
      text:
        locale === "ar"
          ? "أكمل بيانات الاستلام في هذه البطاقة."
          : "Complete the delivery details in this card.",
    };
  if (item.name === "choose_product_filters")
    return {
      type: "card",
      card: { type: "filters", filters: normalizeFilters() },
      text:
        locale === "ar"
          ? "اختار التفضيلات المناسبة لك."
          : "Choose the options that matter to you.",
    };
  if (item.name === "filter_products") {
    const filters = normalizeFilters(args);
    const ids = filterCatalog(filters);
    return ids.length
      ? {
          type: "card",
          card: createProductCard("products", ids),
          text:
            locale === "ar"
              ? "دي المنتجات المطابقة."
              : "These products match your preferences.",
        }
      : {
          type: "messages",
          messages:
            locale === "ar"
              ? ["مفيش منتجات مطابقة.", "جرّب تغيير السعر أو المجموعات."]
              : [
                  "No products match those preferences.",
                  "Try changing the price or collections.",
                ],
        };
  }
  if (item.name === "reference_message" && messageIds.includes(args.messageId))
    return {
      type: "reference",
      messageId: args.messageId,
      text:
        locale === "ar"
          ? "ارجع للرسالة دي لاختيارك السابق."
          : "Here’s the message with your earlier choice.",
    };
  if (
    item.name === "choose_product_options" &&
    enumIDs.includes(args.productId)
  )
    return {
      type: "card",
      card: { type: "options", productId: args.productId },
      text:
        locale === "ar"
          ? "اختار اللون المناسب لك."
          : "Which color do you like?",
    };
  if (
    ["show_products", "compare_products"].includes(item.name) &&
    Array.isArray(args.productIds) &&
    args.productIds.length <= 3 &&
    args.productIds.every((id) => enumIDs.includes(id))
  )
    return {
      type: "card",
      card: createProductCard(
        item.name === "show_products" ? "products" : "comparison",
        args.productIds,
      ),
      text:
        locale === "ar"
          ? "شوف الاختيارات دي، واختار اللي يناسبك."
          : "Take a look at these options and choose what suits you.",
    };
  throw new Error("Unknown or invalid presentation method");
}
export function demoPresentation(
  text: string,
  history: T.AgentMessage[],
): T.Presentation | null {
  const raw = text.split("\n\n[Message ID:")[0].toLowerCase();
  if (/poll|استطلاع|تصويت/.test(raw))
    return {
      type: "poll",
      poll: {
        question: /[\u0600-\u06ff]/.test(raw)
          ? "ما أهم شيء عند اختيار منتج؟"
          : "What matters most when choosing?",
        options: (/[\u0600-\u06ff]/.test(raw)
          ? ["السعر", "الأداء", "الكاميرا"]
          : ["Price", "Performance", "Camera"]
        ).map((label, i) => ({ id: `option-${i + 1}`, label })),
        vote: null,
      },
    };
  if (/خيارات قرار|اختيارات متعددة|suggest options|action choices/.test(raw))
    return {
      type: "card",
      card: {
        type: "action-choice",
        question: /[\u0600-\u06ff]/.test(raw)
          ? "ما الذي تريد التركيز عليه؟"
          : "What would you like to focus on?",
        options: (/[\u0600-\u06ff]/.test(raw)
          ? ["تحديد الميزانية", "مقارنة المنتجات", "إكمال الطلب"]
          : ["Set a budget", "Compare products", "Continue an order"]
        ).map((label, i) => ({ id: `option-${i + 1}`, label })),
        multiple: true,
        selected: [],
      },
    };
  if (/what.*(choose|select)|my (choice|selection)|اخترت|اختياري/.test(raw)) {
    const choice = [...history]
      .reverse()
      .find((item) => /Product choice:/.test(item.text));
    if (choice?.id) return { type: "reference", messageId: choice.id };
  }
  if (
    /checkout|place.*order|order.*now|أطلب|اطلب|إكمال الطلب|اكمال الطلب/.test(
      raw,
    )
  ) {
    const choice = [...history]
      .reverse()
      .find((item) => /Product choice:/.test(item.text));
    if (choice?.id)
      return {
        type: "card",
        card: { type: "order-request", messageId: choice.id },
      };
  }
  const budget = raw.match(
    /(?:under|below|less than|أقل من)\s*\$?(\d+(?:\.\d+)?)/,
  );
  if (budget && Number(budget[1]) <= 100000) {
    const ids = filterCatalog({ maxPrice: Number(budget[1]) });
    if (ids.length)
      return { type: "card", card: createProductCard("products", ids) };
  }
  if (
    /preferences|filters?|budget|price|collection|types?|sizes?|تفضيلات|السعر|مجموعات|النوع|الحجم/.test(
      raw,
    )
  )
    return {
      type: "card",
      card: { type: "filters", filters: normalizeFilters() },
    };
  if (/colou?r|purple|لون|بنفسجي/.test(raw)) {
    const earlier = [...history]
      .reverse()
      .find((item) => /Product choice:/.test(item.text));
    const product =
      PRODUCTS.find(
        (item) => raw.includes(item.id) || raw.includes(item.nameAr),
      ) ||
      PRODUCTS.find((item) => earlier?.text.includes(item.name)) ||
      PRODUCTS[0];
    return { type: "card", card: { type: "options", productId: product.id } };
  }
  if (/compare|قارن|مقارنة/.test(raw))
    return { type: "card", card: createProductCard("comparison") };
  if (
    /product|electronics|shopping|browse|phone|tablet|headphone|منتجات|إلكترونيات|هاتف|تابلت|سماعات/.test(
      raw,
    )
  )
    return { type: "card", card: createProductCard("products") };
  return null;
}
