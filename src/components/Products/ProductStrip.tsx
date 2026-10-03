import type * as T from "../../lib/types";
import { useRef, useState } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Columns2,
  Check,
  X,
  ArrowUpRight,
} from "lucide-react";
import { requireProduct, productName, priceLabel } from "../../lib/products";
import { useLocale } from "../../lib/i18n";
export default function ProductStrip({
  card,
  onChoose,
  onCompare,
  onSelectProducts,
  disabled,
}: {
  card: T.ProductCard & { productIds: string[] };
  onChoose: T.ProductActions["onChoose"];
  onCompare: (ids: string[]) => void;
  onSelectProducts: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const { locale, t } = useLocale();
  const products = card.productIds
    .map(requireProduct)
    .filter((value): value is NonNullable<typeof value> => Boolean(value));
  const [index, setIndex] = useState(0);
  const [comparing, setComparing] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const track = useRef<HTMLDivElement | null>(null);
  function move(next: number) {
    if (!track.current) return;
    const target = Math.max(0, Math.min(products.length - 1, next));
    const distance = track.current.scrollWidth - track.current.clientWidth;
    const step =
      track.current.children[0].getBoundingClientRect().width +
      parseFloat(getComputedStyle(track.current).columnGap);
    track.current.scrollTo({
      left: (locale === "ar" ? -1 : 1) * Math.min(distance, target * step),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }
  function locate() {
    if (!track.current) return;
    const distance = track.current.scrollWidth - track.current.clientWidth;
    const position = Math.abs(track.current.scrollLeft);
    const step =
      track.current.children[0].getBoundingClientRect().width +
      parseFloat(getComputedStyle(track.current).columnGap);
    setIndex(
      distance <= 0
        ? 0
        : position >= distance - 1
          ? products.length - 1
          : Math.min(products.length - 1, Math.round(position / step)),
    );
  }

  return (
    <section className="product-strip" aria-label={t("products")}>
      <div className="product-strip-heading">
        <strong>{t("electronics")}</strong>
        <button
          className="compare-toggle"
          type="button"
          aria-label={t(comparing ? "cancelCompare" : "compareMode")}
          aria-pressed={comparing}
          disabled={disabled}
          onClick={() => {
            setComparing(!comparing);
            setSelected([]);
          }}
        >
          {comparing ? <X size={15} /> : <Columns2 size={15} />}
        </button>
        <span>
          {index + 1} / {products.length}
        </span>
      </div>
      <div
        ref={track}
        className="product-track"
        role="list"
        aria-label={t("productList")}
        onScroll={locate}
      >
        {products.map((product, i) => (
          <div
            className="product-tile"
            role="listitem"
            key={product.id}
            style={{ "--item-index": i }}
          >
            <button
              type="button"
              className="product-card-hit"
              aria-label={t("productDetails", {
                name: productName(product, locale),
              })}
              disabled={disabled}
              onClick={() => onChoose(product.id)}
            >
              <Image
                src={product.image}
                alt={productName(product, locale)}
                width={240}
                height={240}
                className="product-image"
              />
              <div className="product-tile-copy">
                <strong>{productName(product, locale)}</strong>
                <span>{priceLabel(product.price, locale)}</span>
                <p>{locale === "ar" ? product.featureAr : product.feature}</p>
              </div>
            </button>
            <div className="product-card-actions">
              <button
                type="button"
                className="card-action-button"
                disabled={disabled}
                onClick={() => onChoose(product.id)}
                aria-label={t("chooseProduct", {
                  name: productName(product, locale),
                })}
              >
                {t("chooseProduct", { name: productName(product, locale) })}
                <ArrowUpRight size={14} aria-hidden="true" />
              </button>
            </div>
            {comparing && (
              <label className="compare-check overlay-product-check">
                <input
                  type="checkbox"
                  checked={selected.includes(product.id)}
                  disabled={disabled}
                  onChange={() =>
                    setSelected((ids) =>
                      ids.includes(product.id)
                        ? ids.filter((id) => id !== product.id)
                        : [...ids, product.id],
                    )
                  }
                />
                <span className="visually-hidden">
                  {t("compareProduct", { name: productName(product, locale) })}
                </span>
                <Check size={16} aria-hidden="true" />
              </label>
            )}
          </div>
        ))}
      </div>
      <div className="product-strip-footer">
        <progress
          max={products.length}
          value={index + 1}
          aria-label={t("productPosition")}
        />
        <button
          type="button"
          aria-label={t("previousProduct")}
          disabled={index === 0}
          onClick={() => move(index - 1)}
        >
          <ChevronLeft size={17} />
        </button>
        <button
          type="button"
          aria-label={t("nextProduct")}
          disabled={index === products.length - 1}
          onClick={() => move(index + 1)}
        >
          <ChevronRight size={17} />
        </button>
      </div>
      {comparing && selected.length > 0 && (
        <button
          type="button"
          className="bare-action"
          disabled={disabled}
          onClick={() => onSelectProducts(selected)}
        >
          {t("useProducts", { count: selected.length })}
        </button>
      )}
      {comparing && selected.length >= 2 && (
        <button
          type="button"
          className="product-secondary"
          disabled={selected.length < 2 || disabled}
          onClick={() => onCompare(selected)}
        >
          {t("compareSelected", { count: selected.length })}
        </button>
      )}
    </section>
  );
}
