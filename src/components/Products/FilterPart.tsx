import type * as T from "../../lib/types";
import { useState } from "react";
import { Check } from "lucide-react";
import { FILTER_OPTIONS, COLORS, variantLabel } from "../../lib/products";
import { useLocale } from "../../lib/i18n";

export default function FilterPart({
  card,
  filterValues,
  onFilterChange,
  onFilter,
  disabled,
}: {
  card: T.ProductCard & { filters: T.Filters; groupId: string };
  filterValues?: T.Filters;
  onFilterChange: (filters: T.Filters) => boolean | void;
  onFilter: (filters: T.Filters) => void;
  disabled?: boolean;
}) {
  const { t, locale } = useLocale();
  const filters = filterValues || card.filters;
  const [invalidPrice, setInvalidPrice] = useState(false);
  function changePrice(next: T.Filters) {
    setInvalidPrice(onFilterChange(next) === false);
  }
  if (card.type === "filter-apply")
    return (
      <section className="criteria-part" aria-label={t("findProducts")}>
        <button
          className="bare-action"
          aria-label={t("findProducts")}
          disabled={disabled}
          onClick={() => onFilter(filters)}
        >
          {t("findProducts")} →
        </button>
      </section>
    );
  const field = card.field;
  if (!field) return null;
  const title = t(
    {
      price: "price",
      colors: "color",
      sizes: "filterSizes",
      types: "type",
      collections: "collections",
    }[field],
  );
  return (
    <section className="criteria-part" aria-label={title}>
      <fieldset>
        <legend>{title}</legend>
        {field === "price" ? (
          <div className="price-options">
            <label>
              {t("minPrice")}
              <input
                type="number"
                min="0"
                max="100000"
                aria-label={t("minPrice")}
                value={filters.minPrice || ""}
                disabled={disabled}
                onChange={(event) =>
                  changePrice({
                    ...filters,
                    minPrice: Number(event.target.value),
                  })
                }
                placeholder="0"
              />
            </label>
            <label>
              {t("maxPrice")}
              <input
                type="number"
                min="0"
                max="100000"
                aria-label={t("maxPrice")}
                value={filters.maxPrice ?? ""}
                disabled={disabled}
                onChange={(event) =>
                  changePrice({
                    ...filters,
                    maxPrice:
                      event.target.value === ""
                        ? null
                        : Number(event.target.value),
                  })
                }
                placeholder="—"
              />
            </label>
          </div>
        ) : (
          <div
            className={`criteria-options ${field === "colors" ? "criteria-colors" : ""}`}
          >
            {FILTER_OPTIONS[field].map((value) => {
              const color = COLORS.find((item) => item.id === value);
              const label = color
                ? color[locale]
                : field === "sizes"
                  ? variantLabel(value, locale)
                  : t(value);
              return (
                <label key={value} className="check-option">
                  <input
                    type="checkbox"
                    aria-label={label}
                    checked={filters[field].includes(value)}
                    disabled={disabled}
                    onChange={() =>
                      changePrice({
                        ...filters,
                        [field]: filters[field].includes(value)
                          ? filters[field].filter((item) => item !== value)
                          : [...filters[field], value],
                      })
                    }
                  />
                  <span
                    className={color ? "filter-swatch" : ""}
                    style={
                      color
                        ? {
                            background: color.hex,
                            "--check-color":
                              color.id === "silver" ? "#111" : "#fff",
                          }
                        : undefined
                    }
                  >
                    {color ? null : label}
                    <Check
                      className="option-check"
                      size={14}
                      aria-hidden="true"
                    />
                  </span>
                  {color && <small>{label}</small>}
                </label>
              );
            })}
          </div>
        )}
      </fieldset>
      {invalidPrice && <p role="alert">{t("invalidPrice")}</p>}
    </section>
  );
}
