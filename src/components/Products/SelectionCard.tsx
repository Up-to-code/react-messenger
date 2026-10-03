import type * as T from "../../lib/types";
import Image from "next/image";
import { Check } from "lucide-react";
import {
  requireProduct,
  productName,
  priceLabel,
  COLORS,
  DELIVERY,
  EXTRAS,
  optionName,
  variantLabel,
} from "../../lib/products";
import { useLocale } from "../../lib/i18n";
export default function SelectionCard({
  card,
  onChoose,
  onDelivery,
  onExtras,
  onConfirm,
  onCheckout,
  disabled,
}: {
  card: T.ProductCard & { selection: T.Selection };
  onChoose: T.ProductActions["onChoose"];
  onDelivery: (selection: T.Selection) => void;
  onExtras: (selection: T.Selection) => void;
  onConfirm: (selection: T.Selection) => void;
  onCheckout: (selection: T.Selection) => void;
  disabled?: boolean;
}) {
  const { t, locale } = useLocale();
  const choice = card.selection;
  const product = requireProduct(choice.productId);
  const confirmed = card.type === "confirmed";
  const progress = confirmed ? 100 : (choice.stage || 1) * 25;
  return (
    <section
      className="selection-card"
      aria-label={t(confirmed ? "savedChoice" : "yourChoice")}
    >
      <div className="selection-head">
        <Image
          src={product.image}
          width={84}
          height={84}
          alt={productName(product, locale)}
        />
        <div>
          <h3>{productName(product, locale)}</h3>
          <span>{priceLabel(product.price, locale)}</span>
          {confirmed && (
            <span className="choice-saved">
              <Check size={14} />
              {t("savedChoice")}
            </span>
          )}
        </div>
      </div>
      <dl>
        <div>
          <dt>{t(product.variantKey)}</dt>
          <dd>{variantLabel(choice.variant, locale)}</dd>
        </div>
        <div>
          <dt>{t("color")}</dt>
          <dd>
            <i
              className="color-dot"
              style={{
                background: COLORS.find((c) => c.id === choice.color)?.hex,
              }}
            />
            {(choice.colors || [choice.color])
              .map((id) => optionName(COLORS, id, locale))
              .join(", ")}
          </dd>
        </div>
        <div>
          <dt>{t("delivery")}</dt>
          <dd>{optionName(DELIVERY, choice.delivery, locale)}</dd>
        </div>
        <div>
          <dt>{t("extras")}</dt>
          <dd>
            {choice.extras.length
              ? choice.extras
                  .map((id) => optionName(EXTRAS, id, locale))
                  .join(", ")
              : t("noExtras")}
          </dd>
        </div>
      </dl>
      <div className="selection-progress">
        <progress
          max="100"
          value={progress}
          aria-label={t("selectionProgress")}
        />
        <span>{progress}%</span>
      </div>
      <div className="selection-next">
        <button
          type="button"
          className="selection-edit"
          disabled={disabled}
          onClick={() => onChoose(product.id, choice)}
        >
          {t("changeOptions")}
        </button>
        {confirmed && (
          <button
            type="button"
            className="selection-continue"
            disabled={disabled}
            onClick={() => onCheckout(choice)}
          >
            {t("checkout")}
          </button>
        )}
        {!confirmed && (
          <button
            type="button"
            className="selection-continue"
            disabled={disabled}
            onClick={() =>
              (choice.stage || 1) < 2
                ? onDelivery(choice)
                : (choice.stage || 1) < 3
                  ? onExtras(choice)
                  : onConfirm(choice)
            }
          >
            {t(
              (choice.stage || 1) < 2
                ? "delivery"
                : (choice.stage || 1) < 3
                  ? "extras"
                  : "saveChoice",
            )}
          </button>
        )}
      </div>
    </section>
  );
}
