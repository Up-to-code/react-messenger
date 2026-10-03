import { useId, useState } from "react";
import { Check, ArrowRight } from "lucide-react";
import { COLORS, productById } from "../../lib/products";
import { useLocale } from "../../lib/i18n";

export default function ColorOptions({
  productId,
  selection,
  onSelect,
  disabled,
  variantOverride,
}) {
  const { t, locale } = useLocale();
  const product = productById(productId);
  const name = useId();
  const [colors, setColors] = useState(
    selection?.colors || (selection?.color ? [selection.color] : []),
  );
  const variant = variantOverride || selection?.variant || product.variants[0];
  return (
    <section
      className="color-choice bare-options"
      aria-label={t("chooseColor")}
    >
      <fieldset>
        <legend>{t("color")}</legend>
        <div className="color-swatches">
          {COLORS.filter((color) => product.colors.includes(color.id)).map(
            (color) => (
              <label key={color.id} className="check-option color-option">
                <input
                  type="checkbox"
                  name={name}
                  aria-label={color[locale]}
                  checked={colors.includes(color.id)}
                  disabled={disabled}
                  onChange={() =>
                    setColors((values) =>
                      values.includes(color.id)
                        ? values.filter((id) => id !== color.id)
                        : [...values, color.id],
                    )
                  }
                />
                <span
                  className="swatch-ball"
                  style={{
                    background: color.hex,
                    "--check-color": color.id === "silver" ? "#111" : "#fff",
                  }}
                >
                  <Check
                    className="option-check"
                    size={17}
                    aria-hidden="true"
                  />
                </span>
                <span className="swatch-name">{color[locale]}</span>
              </label>
            ),
          )}
        </div>
      </fieldset>
      <button
        className="bare-action"
        type="button"
        disabled={disabled || !colors.length}
        onClick={() =>
          onSelect({
            productId,
            variant,
            color: colors[0],
            colors,
            delivery: selection?.delivery || "standard",
            extras: selection?.extras || [],
            stage: 1,
          })
        }
      >
        {t("useSelection")}
        <ArrowRight size={15} aria-hidden="true" />
      </button>
    </section>
  );
}
