"use client";
import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { readOrder, writeOrder, ORDER_ID } from "../../lib/commerce";
import { useLanguage } from "../../hooks/useLanguage";
import { LocaleContext, translate } from "../../lib/i18n";
import { OrderSummary } from "./OrderCards";
import "./Products.css";
function subscribe(callback) {
  window.addEventListener("storage", callback);
  window.addEventListener("messages-order-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("messages-order-change", callback);
  };
}
export default function PaymentPage({ id }) {
  const [locale] = useLanguage();
  const t = (key, values) => translate(locale, key, values);
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return ORDER_ID.test(id)
          ? localStorage.getItem(`messages-order-${id}`)
          : null;
      } catch {
        return null;
      }
    },
    () => null,
  );
  const order = useMemo(() => (raw ? readOrder(id) : null), [raw, id]);
  const [method, setMethod] = useState("card");
  const [error, setError] = useState(false);
  const finished = Boolean(order?.payment);
  return (
    <LocaleContext value={{ locale, t }}>
      <main
        className="order-page"
        lang={locale}
        dir={locale === "ar" ? "rtl" : "ltr"}
      >
        <nav>
          <Link href={`/orders/${id}`}>{t("backToOrder")}</Link>
          <span>{t("demoOrder")}</span>
        </nav>
        {!order ? (
          <h1>{t("orderUnavailable")}</h1>
        ) : order.status !== "confirmed" ? (
          <>
            <h1>{t("confirmBeforePayment")}</h1>
            <Link className="order-primary" href={`/orders/${id}`}>
              {t("reviewOrder")}
            </Link>
          </>
        ) : (
          <>
            <h1>
              {t(
                finished
                  ? order.payment.status === "paid"
                    ? "demoPaymentComplete"
                    : "codAccepted"
                  : "payment",
              )}
            </h1>
            <OrderSummary order={order} />
            {finished ? (
              <section className="order-step-card" aria-label={t("receipt")}>
                <p>
                  {t("paymentMethod")}:{" "}
                  {t(
                    order.payment.method === "card"
                      ? "demoCard"
                      : "cashOnDelivery",
                  )}
                </p>
                <p>
                  {t("receipt")}: <code>{order.payment.reference}</code>
                </p>
                <p>{t("demoPaymentNote")}</p>
              </section>
            ) : (
              <form
                className="order-step-card"
                onSubmit={(event) => {
                  event.preventDefault();
                  try {
                    const latest = readOrder(id);
                    if (!latest || latest.status !== "confirmed")
                      throw new Error();
                    if (!latest.payment)
                      writeOrder({
                        ...latest,
                        payment: {
                          status: method === "card" ? "paid" : "pending",
                          method,
                          reference: `demo-${crypto.randomUUID()}`,
                          createdAt: Date.now(),
                        },
                      });
                    setError(false);
                  } catch {
                    setError(true);
                  }
                }}
              >
                <fieldset>
                  <legend>{t("paymentMethod")}</legend>
                  <div className="order-choice-grid">
                    {["card", "cod"].map((option) => (
                      <label
                        key={option}
                        className={method === option ? "checked" : ""}
                      >
                        <input
                          type="radio"
                          name="payment-method"
                          checked={method === option}
                          onChange={() => setMethod(option)}
                          aria-label={t(
                            option === "card" ? "demoCard" : "cashOnDelivery",
                          )}
                        />
                        <span>
                          {t(option === "card" ? "demoCard" : "cashOnDelivery")}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <p>{t("demoPaymentNote")}</p>
                <button className="order-primary" type="submit">
                  {t(method === "card" ? "simulatePayment" : "chooseCOD")}
                </button>
              </form>
            )}
            {error && <p role="alert">{t("orderError")}</p>}
            <Link
              className="bare-action"
              href={`/?conversation=${order.conversationId}&message=${order.sourceId}`}
            >
              {t("backToChat")}
            </Link>
          </>
        )}
      </main>
    </LocaleContext>
  );
}
