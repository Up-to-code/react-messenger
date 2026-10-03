import { normalizeOrder } from "./commerce.js";
export const PRODUCTS = [
  {
    id: "phone",
    name: "Orbit Phone",
    nameAr: "هاتف أوربت",
    price: 649,
    colors: ["purple", "graphite", "silver", "blue"],
    type: "phone",
    collections: ["everyday", "work"],
    image: "/products/phone.png",
    variantKey: "storage",
    variants: ["128 GB", "256 GB", "512 GB"],
    feature: "6.2″ OLED · 48 MP camera",
    featureAr: "شاشة OLED ٦٫٢ بوصة · كاميرا ٤٨ ميجابكسل",
  },
  {
    id: "tablet",
    name: "Slate Tablet",
    nameAr: "تابلت سليت",
    price: 449,
    colors: ["graphite", "silver", "blue"],
    type: "tablet",
    collections: ["work", "travel"],
    image: "/products/tablet.png",
    variantKey: "size",
    variants: ["10 inch", "12 inch"],
    feature: "All-day battery · pen support",
    featureAr: "بطارية ليوم كامل · يدعم القلم",
  },
  {
    id: "headphones",
    name: "Studio Headphones",
    nameAr: "سماعات ستوديو",
    price: 199,
    colors: ["graphite", "silver"],
    type: "headphones",
    collections: ["everyday", "travel"],
    image: "/products/headphones.png",
    variantKey: "fit",
    variants: ["On-ear", "Over-ear"],
    feature: "Noise cancellation · 30-hour battery",
    featureAr: "عزل ضوضاء · بطارية ٣٠ ساعة",
  },
];
export const COLORS = [
  { id: "purple", hex: "#8966bc", en: "Purple", ar: "بنفسجي" },
  { id: "graphite", hex: "#343434", en: "Graphite", ar: "جرافيت" },
  { id: "silver", hex: "#c9c9c9", en: "Silver", ar: "فضي" },
  { id: "blue", hex: "#658099", en: "Blue", ar: "أزرق" },
];
export const DELIVERY = [
  { id: "standard", en: "Standard delivery", ar: "توصيل عادي" },
  { id: "express", en: "Express delivery", ar: "توصيل سريع" },
  { id: "pickup", en: "Store pickup", ar: "استلام من المتجر" },
];
export const EXTRAS = [
  { id: "case", en: "Protective case", ar: "جراب حماية" },
  { id: "charger", en: "USB-C charger", ar: "شاحن USB-C" },
  { id: "care", en: "Care plan", ar: "خطة حماية" },
];
export const productById = (id) =>
  PRODUCTS.find((product) => product.id === id);
export const productName = (product, locale) =>
  locale === "ar" ? product.nameAr : product.name;
export const optionName = (options, id, locale) =>
  options.find((option) => option.id === id)?.[locale] || id;
export const priceLabel = (amount, locale) =>
  new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
export function validSelection(selection) {
  const product = productById(selection?.productId);
  return (
    !!product &&
    product.variants.includes(selection.variant) &&
    COLORS.some((color) => color.id === selection.color) &&
    (selection.colors === undefined ||
      (Array.isArray(selection.colors) &&
        selection.colors.length > 0 &&
        selection.colors.length <= COLORS.length &&
        new Set(selection.colors).size === selection.colors.length &&
        selection.colors.includes(selection.color) &&
        selection.colors.every((id) =>
          COLORS.some((color) => color.id === id),
        ))) &&
    DELIVERY.some((option) => option.id === selection.delivery) &&
    Array.isArray(selection.extras) &&
    selection.extras.length <= EXTRAS.length &&
    new Set(selection.extras).size === selection.extras.length &&
    selection.extras.every((id) => EXTRAS.some((option) => option.id === id))
  );
}
export function selectionText(selection, locale) {
  if (!validSelection(selection)) throw new Error("Invalid product choice");
  const product = productById(selection.productId);
  return [
    productName(product, locale),
    variantLabel(selection.variant, locale),
    (selection.colors || [selection.color])
      .map((id) => optionName(COLORS, id, locale))
      .join(", "),
    optionName(DELIVERY, selection.delivery, locale),
    ...selection.extras.map((id) => optionName(EXTRAS, id, locale)),
  ].join(" · ");
}
export function createProductCard(
  type,
  productIds = PRODUCTS.map((product) => product.id),
) {
  const ids = [...new Set(productIds)]
    .filter((id) => productById(id))
    .slice(0, 3);
  if (
    !["products", "comparison", "product-list"].includes(type) ||
    !ids.length ||
    (type === "comparison" && ids.length < 2)
  )
    throw new Error("Invalid product card");
  return { type, productIds: ids };
}
export function normalizeProductCard(card) {
  if (card?.type === "action-choice") {
    if (
      typeof card.question !== "string" ||
      !card.question.trim() ||
      card.question.length > 240 ||
      typeof card.multiple !== "boolean" ||
      !Array.isArray(card.options) ||
      card.options.length < 2 ||
      card.options.length > 6 ||
      !card.options.every(
        (option) =>
          /^[a-zA-Z0-9_-]{1,100}$/.test(option.id) &&
          typeof option.label === "string" &&
          option.label.trim() &&
          option.label.length <= 160,
      ) ||
      new Set(card.options.map((option) => option.id)).size !==
        card.options.length ||
      new Set(card.options.map((option) => option.label.trim().toLowerCase()))
        .size !== card.options.length
    )
      throw new Error("Invalid choices");
    const selected = card.selected || [];
    if (
      !Array.isArray(selected) ||
      selected.some((id) => !card.options.some((option) => option.id === id)) ||
      (!card.multiple && selected.length > 1)
    )
      throw new Error("Invalid answer");
    return {
      type: card.type,
      question: card.question.trim(),
      multiple: card.multiple,
      options: card.options.map((option) => ({
        id: option.id,
        label: option.label.trim(),
      })),
      selected: [...new Set(selected)],
    };
  }
  if (
    ["delivery-choice", "extras-choice", "order-details"].includes(
      card?.type,
    ) &&
    validSelection(card.selection)
  )
    return {
      type: card.type,
      selection: { ...card.selection, extras: [...card.selection.extras] },
    };
  if (card?.type === "order-summary")
    return { type: "order-summary", order: normalizeOrder(card.order) };

  if (card?.type === "filters")
    return { type: "filters", filters: normalizeFilters(card.filters) };
  if (["criterion", "filter-apply"].includes(card?.type)) {
    if (
      typeof card.groupId !== "string" ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(card.groupId) ||
      (card.type === "criterion" && !FILTER_FIELDS.includes(card.field))
    )
      throw new Error("Invalid filter message");
    return {
      type: card.type,
      groupId: card.groupId,
      ...(card.type === "criterion" ? { field: card.field } : {}),
      filters: normalizeFilters(card.filters),
    };
  }

  if (
    ["options", "product-detail", "variant", "color"].includes(card?.type) &&
    productById(card.productId)
  ) {
    const safe = { type: card.type, productId: card.productId };
    if (
      typeof card.groupId === "string" &&
      /^[a-zA-Z0-9_-]{1,100}$/.test(card.groupId)
    )
      safe.groupId = card.groupId;
    if (card.type === "variant") {
      if (!productById(card.productId).variants.includes(card.variant))
        throw new Error("Invalid variant");
      safe.variant = card.variant;
    }
    if (
      validSelection(card.selection) &&
      card.selection.productId === card.productId
    )
      safe.selection = {
        ...card.selection,
        extras: [...card.selection.extras],
      };
    return safe;
  }
  if (["products", "comparison", "product-list"].includes(card?.type))
    return createProductCard(card.type, card.productIds);
  if (
    ["selection", "confirmed"].includes(card?.type) &&
    validSelection(card.selection)
  )
    return {
      type: card.type,
      selection: { ...card.selection, extras: [...card.selection.extras] },
    };
  throw new Error("Invalid card");
}
export function cardContext(card) {
  if (!card) return "";
  const safe = normalizeProductCard(card);
  if (safe.type === "action-choice")
    return `Choice request: ${safe.question}; options: ${safe.options.map((o) => o.label).join(" / ")}; selected: ${safe.options
      .filter((o) => safe.selected.includes(o.id))
      .map((o) => o.label)
      .join(" / ")}`;
  if (safe.type === "order-summary")
    return `Demo order ${safe.order.id}; status: ${safe.order.status}; total USD ${safe.order.quote.total}; payment: ${safe.order.payment?.status || "not started"}; Product choice: ${selectionText(safe.order.selection, "en")}. Customer details collected locally.`;
  if (["delivery-choice", "extras-choice", "order-details"].includes(safe.type))
    return `Order step ${safe.type}; Product choice: ${selectionText(safe.selection, "en")}`;
  if (["filters", "criterion", "filter-apply"].includes(safe.type))
    return `Product preferences: ${JSON.stringify(safe.filters)}`;
  if (["options", "product-detail", "variant", "color"].includes(safe.type))
    return `${safe.type} for ${productById(safe.productId).name}${safe.variant ? `; Variant: ${safe.variant}` : ""}`;
  return safe.selection
    ? `Product choice: ${selectionText(safe.selection, "en")}; confirmed: ${safe.type === "confirmed"}`
    : `${safe.type}: ${safe.productIds.map((id) => productById(id).name).join(", ")}`;
}

// Each choice has a separate method; polls never enter this selection workflow.
export function resolveProductInteraction(method, payload, locale = "en") {
  const ar = locale === "ar";
  if (
    ["requestDelivery", "requestExtras", "beginCheckout"].includes(method) &&
    validSelection(payload.selection)
  )
    return {
      text: ar
        ? {
            requestDelivery: "اختيار التوصيل",
            requestExtras: "اختيار الإضافات",
            beginCheckout: "إكمال الطلب التجريبي",
          }[method]
        : {
            requestDelivery: "Choose delivery",
            requestExtras: "Choose extras",
            beginCheckout: "Continue demo order",
          }[method],
      reply: ar
        ? {
            requestDelivery: "كيف تحب تستلم المنتجات؟",
            requestExtras: "ما الإضافات التي تحتاجها؟",
            beginCheckout: "أكمل بيانات الاستلام هنا، ثم راجع الطلب.",
          }[method]
        : {
            requestDelivery: "How would you like to receive the products?",
            requestExtras: "Which extras would you like?",
            beginCheckout:
              "Add your delivery details here, then review the order.",
          }[method],
      card: {
        type: {
          requestDelivery: "delivery-choice",
          requestExtras: "extras-choice",
          beginCheckout: "order-details",
        }[method],
        selection: payload.selection,
      },
    };
  if (method === "reviewOrder") {
    const order = normalizeOrder(payload.order);
    return {
      text: ar
        ? "بيانات الطلب جاهزة للمراجعة"
        : "Order details are ready to review",
      reply: ar
        ? "راجع المنتجات والإجمالي، ثم افتح صفحة الطلب للتأكيد."
        : "Review the products and total, then open the order page to confirm.",
      card: { type: "order-summary", order },
    };
  }
  if (method === "filterProducts") {
    const filters = normalizeFilters(payload.filters);
    const ids = filterCatalog(filters);
    return {
      text: `${ar ? "تفضيلاتي" : "My preferences"}: ${JSON.stringify(filters)}`,
      reply: ids.length
        ? ar
          ? "دي المنتجات المناسبة للاختيارات دي."
          : "These products match your preferences."
        : ar
          ? "مفيش منتجات مطابقة. جرّب تعديل السعر أو الاختيارات."
          : "No products match these options. Try changing the price or selections.",
      card: ids.length ? createProductCard("products", ids) : null,
    };
  }
  if (method === "requestOptions" && productById(payload.productId))
    return {
      text: ar
        ? "ورّيني خيارات المنتج"
        : `Show ${productById(payload.productId).name} options`,
      reply: ar
        ? "نختار المساحة واللون كل واحد لوحده."
        : "Let’s choose storage and color separately.",
      card: normalizeProductCard({
        type: "options",
        productId: payload.productId,
        selection: payload.selection,
      }),
    };
  if (method === "showProducts")
    return {
      text: ar ? "ورّيني المنتجات" : "Show me the electronics",
      reply: ar
        ? "دي ٣ اختيارات. اختار منتج أو قارن بينهم."
        : "Here are three options. Pick one, or compare a couple.",
      card: createProductCard("products"),
    };
  if (method === "selectProducts") {
    const card = createProductCard("product-list", payload.productIds);
    return {
      text: `${ar ? "اختيار المنتجات" : "Selected products"}: ${card.productIds.map((id) => productName(productById(id), locale)).join(", ")}`,
      reply: ar
        ? "نختار الخيارات لكل منتج."
        : "Let’s choose the options for each product.",
      card,
    };
  }
  if (method === "compareProducts")
    return {
      text: ar ? "قارن بين الاختيارات دي" : "Compare these products",
      reply: ar
        ? "خلينا نشوف الفروق جنب بعض."
        : "Let’s look at them side by side.",
      card: createProductCard("comparison", payload.productIds),
    };
  if (
    [
      "selectProduct",
      "chooseDelivery",
      "chooseExtras",
      "confirmSelection",
    ].includes(method) &&
    validSelection(payload.selection)
  ) {
    const text = selectionText(payload.selection, locale);
    return {
      text:
        method === "confirmSelection"
          ? `${ar ? "اختياري النهائي" : "My final choice"}: ${text}`
          : text,
      reply:
        method === "confirmSelection"
          ? ar
            ? "حفظت اختيارك هنا. تقدر ترجع له من الرسالة دي؛ ده اختيار تجريبي مش طلب شراء."
            : "Your choice is saved here. You can return to this message; this is a demo selection, not a purchase."
          : method === "selectProduct"
            ? ar
              ? "تمام. تحب التوصيل يكون إزاي؟"
              : "Got it. How would you like it delivered?"
            : method === "chooseDelivery"
              ? ar
                ? "تحب تضيف أي إضافات؟"
                : "Would you like any extras?"
              : ar
                ? "جاهز نحفظ اختيارك؟"
                : "Ready to save your choice?",
      card: {
        type: method === "confirmSelection" ? "confirmed" : "selection",
        selection: {
          ...payload.selection,
          stage:
            method === "confirmSelection" ? 4 : payload.selection.stage || 1,
          extras: [...payload.selection.extras],
        },
      },
    };
  }
  throw new Error("Unknown or invalid choice method");
}

export const FILTER_FIELDS = [
  "price",
  "colors",
  "sizes",
  "types",
  "collections",
];
export const COLLECTIONS = ["everyday", "work", "travel"];
export const FILTER_OPTIONS = {
  colors: COLORS.map((color) => color.id),
  sizes: PRODUCTS.flatMap((product) => product.variants),
  types: PRODUCTS.map((product) => product.type),
  collections: COLLECTIONS,
};
export function normalizeFilters(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid filters");
  const filters = {
    minPrice: value.minPrice ?? 0,
    maxPrice: value.maxPrice ?? null,
  };
  if (
    !Number.isFinite(filters.minPrice) ||
    filters.minPrice < 0 ||
    filters.minPrice > 100000 ||
    (filters.maxPrice !== null &&
      (!Number.isFinite(filters.maxPrice) ||
        filters.maxPrice < filters.minPrice ||
        filters.maxPrice > 100000))
  )
    throw new Error("Invalid price range");
  for (const [field, options] of Object.entries(FILTER_OPTIONS)) {
    const values = value[field] ?? [];
    if (
      !Array.isArray(values) ||
      values.length > options.length ||
      new Set(values).size !== values.length ||
      !values.every((item) => options.includes(item))
    )
      throw new Error("Invalid filter options");
    filters[field] = [...values];
  }
  return filters;
}
export function filterCatalog(value) {
  const filters = normalizeFilters(value);
  return PRODUCTS.filter(
    (product) =>
      product.price >= filters.minPrice &&
      (filters.maxPrice === null || product.price <= filters.maxPrice) &&
      (!filters.types.length || filters.types.includes(product.type)) &&
      (!filters.collections.length ||
        product.collections.some((collection) =>
          filters.collections.includes(collection),
        )) &&
      (!filters.sizes.length ||
        product.variants.some((size) => filters.sizes.includes(size))) &&
      (!filters.colors.length ||
        filters.colors.some((color) => product.colors.includes(color))),
  ).map((product) => product.id);
}

export function variantLabel(value, locale) {
  if (locale !== "ar") return value;
  if (value === "On-ear") return "فوق الأذن";
  if (value === "Over-ear") return "حول الأذن";
  const number = value.match(/^(\d+) /)?.[1];
  return number
    ? `${new Intl.NumberFormat("ar-EG").format(Number(number))} ${value.endsWith("GB") ? "جيجابايت" : "بوصة"}`
    : value;
}
export function resolveContextualCard(card, messages) {
  if (card?.type !== "order-request") return normalizeProductCard(card);
  const source = messages.find((item) => item.id === card.messageId);
  const selection =
    source?.productCard?.selection || source?.interaction?.payload?.selection;
  if (!validSelection(selection))
    throw new Error("An order needs an existing valid choice");
  return normalizeProductCard({ type: "order-details", selection });
}
