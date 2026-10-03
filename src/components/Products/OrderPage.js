"use client";
import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useLanguage } from "../../hooks/useLanguage";
import { LocaleContext, translate } from "../../lib/i18n";
import { readOrder, writeOrder, ORDER_ID } from "../../lib/commerce";
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
export default function OrderPage({ id }) {
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
  const [error, setError] = useState(false);
  return (
    <LocaleContext value={{ locale, t }}>
      <main
        className="order-page"
        lang={locale}
        dir={locale === "ar" ? "rtl" : "ltr"}
      >
        <nav>
          <Link
            href={
              order
                ? `/?conversation=${order.conversationId}&message=${order.sourceId}`
                : "/"
            }
          >
            {t("backToChat")}
          </Link>
          <span>{t("demoOrder")}</span>
        </nav>
        {order ? (
          <>
            <h1>
              {t(
                order.status === "confirmed" ? "orderConfirmed" : "orderReview",
              )}
            </h1>
            <p>
              {t("orderNumber")}: {order.id}
            </p>
            <OrderSummary order={order} />
            <section
              className="order-step-card"
              aria-label={t("customerDetails")}
            >
              <h2>{t("customerDetails")}</h2>
              <dl className="order-totals">
                {["name", "phone", "city", "address"].map((field) => (
                  <div key={field}>
                    <dt>
                      {t(
                        {
                          name: "customerName",
                          phone: "customerPhone",
                          city: "customerCity",
                          address: "customerAddress",
                        }[field],
                      )}
                    </dt>
                    <dd dir="auto">{order.customer[field] || "—"}</dd>
                  </div>
                ))}
              </dl>
            </section>
            {order.status === "draft" ? (
              <button
                className="order-primary"
                onClick={() => {
                  try {
                    writeOrder({ ...order, status: "confirmed" });
                  } catch {
                    setError(true);
                  }
                }}
              >
                {t("confirmDemoOrder")}
              </button>
            ) : (
              <>
                <p role="status">{t("demoOrderConfirmed")}</p>
                <Link
                  className="order-primary"
                  href={`/orders/${order.id}/payment`}
                >
                  {t("continuePayment")}
                </Link>
              </>
            )}
            {error && <p role="alert">{t("orderError")}</p>}
            <p className="order-note">{t("orderLocalNote")}</p>
          </>
        ) : (
          <>
            <h1>{t("orderUnavailable")}</h1>
            <p>{t("orderUnavailableNote")}</p>
          </>
        )}
      </main>
    </LocaleContext>
  );
}
