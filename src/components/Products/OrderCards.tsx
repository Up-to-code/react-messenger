import type * as T from "../../lib/types";
import DeliveryCalendar from "./DeliveryCalendar";
import { automaticDeliveryDate } from "../../lib/business-policy";
import { DELIVERY_PRICES, EXTRA_PRICES } from "../../lib/commerce";
import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import {
  DELIVERY,
  EXTRAS,
  requireProduct,
  productName,
  priceLabel,
  selectionText,
} from "../../lib/products";
import { normalizeCustomer, quoteSelection } from "../../lib/commerce";
import { useLocale } from "../../lib/i18n";

export function OrderChoice({
  card,
  disabled,
  onDeliveryChoice,
  onExtrasChoice,
}: {
  card: T.ProductCard & { selection: T.Selection };
  disabled?: boolean;
  onDeliveryChoice: (selection: T.Selection) => void;
  onExtrasChoice: (selection: T.Selection) => void;
}) {
  const { t, locale } = useLocale();
  const multiple = card.type === "extras-choice";
  const options = multiple ? EXTRAS : DELIVERY;
  const [selectedExtras, setSelectedExtras] = useState(card.selection.extras);
  const [selectedDelivery, setSelectedDelivery] = useState(
    card.selection.delivery,
  );
  return (
    <section
      className="order-step-card"
      aria-label={t(multiple ? "extras" : "delivery")}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const next = {
            ...card.selection,
            ...(multiple
              ? { extras: selectedExtras, stage: 3 }
              : { delivery: selectedDelivery, stage: 2 }),
          };
          (multiple ? onExtrasChoice : onDeliveryChoice)(next);
        }}
      >
        <fieldset>
          <legend>{t(multiple ? "chooseMultiple" : "chooseOne")}</legend>
          <div className="order-choice-grid">
            {options.map((option) => {
              const checked = multiple
                ? selectedExtras.includes(option.id as T.Extra)
                : selectedDelivery === option.id;
              return (
                <label key={option.id} className={checked ? "checked" : ""}>
                  <input
                    type={multiple ? "checkbox" : "radio"}
                    name="order-choice"
                    aria-label={option[locale]}
                    checked={checked}
                    disabled={disabled}
                    onChange={() =>
                      multiple
                        ? setSelectedExtras(
                            checked
                              ? selectedExtras.filter((id) => id !== option.id)
                              : [...selectedExtras, option.id as T.Extra],
                          )
                        : setSelectedDelivery(option.id as T.Delivery)
                    }
                  />
                  <span>
                    {option[locale]}
                    <small>
                      {priceLabel(
                        multiple
                          ? EXTRA_PRICES[option.id as T.Extra]
                          : DELIVERY_PRICES[option.id as T.Delivery],
                        locale,
                      )}
                    </small>
                    <Check size={15} aria-hidden="true" />
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <button type="submit" className="bare-action" disabled={disabled}>
          {t("continueChoice")} <span aria-hidden="true">→</span>
        </button>
      </form>
    </section>
  );
}
export function OrderDetails({
  card,
  onOrder,
  disabled,
}: {
  card: T.ProductCard & { selection: T.Selection };
  onOrder: (selection: T.Selection, customer: T.Customer) => boolean | void;
  disabled?: boolean;
}) {
  const { t, locale } = useLocale();
  const [error, setError] = useState(false);
  const pickup = card.selection.delivery === "pickup";
  const [date, setDate] = useState(() =>
    automaticDeliveryDate(card.selection.delivery),
  );
  const product = requireProduct(card.selection.productId);
  const quote = quoteSelection(card.selection);
  return (
    <section className="order-step-card" aria-label={t("customerDetails")}>
      <header>
        <span>{productName(product, locale)}</span>
        <small>
          {priceLabel(quote.total, locale)} · {t("demoOrder")}
        </small>
      </header>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            const customer = normalizeCustomer(
              Object.fromEntries(new FormData(event.currentTarget)),
              card.selection.delivery,
            );
            setError(onOrder(card.selection, customer) === false);
          } catch {
            setError(true);
          }
        }}
      >
        <div className="order-fields">
          {(
            [
              ["name", "customerName", "text", 80],
              ["phone", "customerPhone", "tel", 24],
              ["city", "customerCity", "text", 80],
              ["address", "customerAddress", "text", 240],
            ] as const
          ).map(([name, label, type, max]) => (
            <label key={name}>
              {t(label)}
              <input
                name={name}
                aria-label={t(label)}
                type={type}
                maxLength={max}
                required={!pickup || ["name", "phone"].includes(name)}
                autoComplete={
                  {
                    name: "name",
                    phone: "tel",
                    city: "address-level2",
                    address: "street-address",
                  }[name]
                }
                disabled={disabled}
              />
            </label>
          ))}
          <DeliveryCalendar
            delivery={card.selection.delivery}
            value={date}
            onChange={setDate}
            disabled={disabled}
          />
          <label>
            {t("deliverySlot")}
            <select
              name="slot"
              aria-label={t("deliverySlot")}
              disabled={disabled}
            >
              {["morning", "afternoon", "evening"].map((slot) => (
                <option key={slot} value={slot}>
                  {t(slot)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error && <p role="alert">{t("orderError")}</p>}
        <button type="submit" className="order-primary" disabled={disabled}>
          {t("reviewOrder")}
        </button>
      </form>
    </section>
  );
}
export function OrderSummary({ order }: { order: T.Order }) {
  const { t, locale } = useLocale();
  return (
    <section className="order-step-card" aria-label={t("orderReview")}>
      <header>
        <span>{t("orderReview")}</span>
        <small>{t("demoOrder")}</small>
      </header>
      <p>{selectionText(order.selection, locale)}</p>
      <dl className="order-totals">
        {["subtotal", "extras", "delivery", "total"].map((field) => (
          <div key={field}>
            <dt>
              {t(
                field === "subtotal"
                  ? "subtotal"
                  : field === "total"
                    ? "orderTotal"
                    : field,
              )}
            </dt>
            <dd>
              {priceLabel(
                order.quote[field as Exclude<keyof T.Quote, "currency">],
                locale,
              )}
            </dd>
          </div>
        ))}
      </dl>
      <p>
        {t("deliveryDate")}: {order.customer.date} · {t(order.customer.slot)}
      </p>
      <Link className="order-primary" href={`/orders/${order.id}`}>
        {t("openOrder")}
      </Link>
    </section>
  );
}
