import type * as T from "../../lib/types";
import { useId } from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import {
  requireProduct,
  productName,
  priceLabel,
  variantLabel,
} from "../../lib/products";
import { useLocale } from "../../lib/i18n";

export function ProductDetail({
  card,
}: {
  card: T.ProductCard & { productId: string };
}) {
  const { locale } = useLocale();
  const product = requireProduct(card.productId);
  return (
    <section
      className="option-product-part"
      aria-label={productName(product, locale)}
    >
      <Image src={product.image} width={48} height={48} alt="" />
      <div>
        <span className="product-part-name">
          {productName(product, locale)}
        </span>
        <span>{priceLabel(product.price, locale)}</span>
      </div>
    </section>
  );
}
export function VariantPart({
  card,
  onVariant,
  disabled,
}: {
  card: T.ProductCard & { productId: string; variant: string };
  onVariant: (variant: string) => void;
  disabled?: boolean;
}) {
  const { t, locale } = useLocale();
  const product = requireProduct(card.productId);
  const name = useId();
  return (
    <section className="option-variant-part" aria-label={t("variantOptions")}>
      <fieldset>
        <legend>{t(product.variantKey)}</legend>
        <div className="variant-pills">
          {product.variants.map((value) => (
            <label
              key={value}
              className={card.variant === value ? "chosen" : ""}
            >
              <input
                type="radio"
                name={name}
                value={value}
                checked={card.variant === value}
                disabled={disabled}
                onChange={() => onVariant(value)}
              />
              <span>
                {variantLabel(value, locale)}
                <Check className="option-check" size={14} aria-hidden="true" />
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
