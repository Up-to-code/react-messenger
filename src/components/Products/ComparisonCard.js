import Image from "next/image";
import { productById, productName, priceLabel } from "../../lib/products";
import { useLocale } from "../../lib/i18n";
export default function ComparisonCard({ card, onChoose, disabled }) {
  const { t, locale } = useLocale();
  return (
    <section className="comparison-card" aria-label={t("comparison")}>
      <h3>{t("comparison")}</h3>
      <div className="comparison-grid">
        {card.productIds.map((id) => {
          const p = productById(id);
          return (
            <div key={id}>
              <Image
                src={p.image}
                width={140}
                height={140}
                alt={productName(p, locale)}
              />
              <h4>{productName(p, locale)}</h4>
              <strong>{priceLabel(p.price, locale)}</strong>
              <p>{locale === "ar" ? p.featureAr : p.feature}</p>
              <p>{p.variants.join(" / ")}</p>
              <button
                type="button"
                className="product-button"
                disabled={disabled}
                onClick={() => onChoose(id)}
              >
                {t("chooseProduct", { name: productName(p, locale) })}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
