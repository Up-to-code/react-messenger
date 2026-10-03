import type * as T from "./types";
import {
  normalizeProductCard,
  requireProduct,
  FILTER_FIELDS,
} from "./products.ts";

// Preserve the source ID; each ready UI part is an actual transcript message.
export function splitOptionsMessage(
  message: T.Message,
  makeId: (suffix: string) => string = (suffix) =>
    `${message.id.slice(0, 85)}_${suffix}`,
): T.Message[] {
  if (message.productCard?.type === "filters") {
    const card = normalizeProductCard(message.productCard);
    const base = { ...message, message: "", references: undefined };
    const parts: T.Message[] = FILTER_FIELDS.map((field) => ({
      ...base,
      id: makeId(field),
      productCard: {
        type: "criterion",
        field,
        filters: card.filters!,
        groupId: message.id,
      },
    }));
    parts.push({
      ...base,
      id: makeId("apply"),
      productCard: {
        type: "filter-apply",
        filters: card.filters!,
        groupId: message.id,
      },
    });
    if (message.message) return [{ ...message, productCard: null }, ...parts];
    parts[0].id = message.id;
    return parts;
  }
  if (message.productCard?.type !== "options") {
    if (!message.productCard || !message.message) return [message];
    return [
      { ...message, productCard: null },
      {
        ...message,
        id: makeId("card"),
        message: "",
        references: undefined,
      },
    ];
  }
  const card = normalizeProductCard(message.productCard);
  const product = requireProduct(card.productId!);
  const groupId = message.id;
  const base = {
    ...message,
    message: "",
    productCard: null,
    references: undefined,
  };
  const overview: T.Message = {
    ...base,
    id: makeId("product"),
    productCard: { type: "product-detail", productId: product.id, groupId },
  };
  const storage: T.Message = {
    ...base,
    id: makeId("storage"),
    productCard: {
      type: "variant",
      productId: product.id,
      groupId,
      variant: card.selection?.variant || product.variants[0],
    },
  };
  const color: T.Message = {
    ...base,
    id: makeId("color"),
    productCard: {
      type: "color",
      productId: product.id,
      groupId,
      ...(card.selection ? { selection: card.selection } : {}),
    },
  };
  // The original root remains addressable even when it contains only the product.
  if (!message.message) {
    overview.id = message.id;
    return [overview, storage, color];
  }
  return [{ ...message, productCard: null }, overview, storage, color];
}
export function waitForPart(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted)
      return reject(new DOMException("Aborted", "AbortError"));
    const aborted = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", aborted);
      resolve();
    }, ms);
    signal.addEventListener("abort", aborted, { once: true });
  });
}
