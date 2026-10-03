import Image from "next/image";
import { Check } from "lucide-react";
import { productById, productName, priceLabel } from "../../lib/products";
import { useLocale } from "../../lib/i18n";
export default function ProductList({ card, onChoose, disabled }) {
  const { t, locale } = useLocale();
  return (
    <section
      className="selected-product-list"
      aria-label={t("selectedProducts")}
    >
      <ul>
        {card.productIds.map((id) => {
          const product = productById(id);
          return (
            <li key={id}>
              <span className="selected-product-image">
                <Image src={product.image} alt="" width={48} height={48} />
                <Check size={14} aria-hidden="true" />
              </span>
              <div>
                <span>{productName(product, locale)}</span>
                <small>{priceLabel(product.price, locale)}</small>
              </div>
              <button
                className="bare-action"
                aria-label={t("chooseProduct", {
                  name: productName(product, locale),
                })}
                disabled={disabled}
                onClick={() => onChoose(id)}
              >
                {t("changeOptions")} →
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
