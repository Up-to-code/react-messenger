import { useId, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "../../lib/i18n";
import {
  BUSINESS_POLICY,
  addDays,
  deliveryDates,
} from "../../lib/business-policy";
const MONTHS = {
  ar: [
    "يناير",
    "فبراير",
    "مارس",
    "أبريل",
    "مايو",
    "يونيو",
    "يوليو",
    "أغسطس",
    "سبتمبر",
    "أكتوبر",
    "نوفمبر",
    "ديسمبر",
  ],
  en: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
};
export default function DeliveryCalendar({
  delivery,
  value,
  onChange,
  disabled,
}) {
  const { locale, t } = useLocale();
  const label = useId();
  const buttons = useRef(new Map());
  const dates = deliveryDates(delivery);
  const [month, setMonth] = useState((value || dates[0] || new Date().toISOString()).slice(0, 7));
  const year = Number(month.slice(0, 4)),
    index = Number(month.slice(5, 7)) - 1;
  const first = `${month}-01`;
  const offset = new Date(`${first}T12:00:00Z`).getUTCDay();
  const length = new Date(Date.UTC(year, index + 1, 0)).getUTCDate();
  const digits = (value) =>
    locale === "ar"
      ? String(value).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)])
      : String(value);
  const labelFor = (value) =>
    `${digits(Number(value.slice(8, 10)))} ${MONTHS[locale][Number(value.slice(5, 7)) - 1]} ${digits(value.slice(0, 4))}`;
  function move(direction) {
    const next = new Date(Date.UTC(year, index + direction, 1))
      .toISOString()
      .slice(0, 7);
    setMonth(next);
  }
  function key(event, date) {
    const delta = {
      ArrowRight: locale === "ar" ? -1 : 1,
      ArrowLeft: locale === "ar" ? 1 : -1,
      ArrowDown: 7,
      ArrowUp: -7,
    }[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    let next = addDays(date, delta);
    // Move through available dates only; never select implicitly with arrow keys.
    for (let i = 0; i < 40 && !dates.includes(next); i++)
      next = addDays(next, delta > 0 ? 1 : -1);
    if (!dates.includes(next)) return;
    setMonth(next.slice(0, 7));
    requestAnimationFrame(() => buttons.current.get(next)?.focus());
  }
  return (
    <div className="delivery-calendar" aria-label={t("customCalendar")}>
      <input type="hidden" name="date" value={value} />
      <p className="arrival-estimate">
        {t("automaticArrival")}: <time dateTime={value}>{value ? labelFor(value) : t("orderError")}</time>
      </p>
      <small>{t("arrivalRules")}</small>
      {BUSINESS_POLICY.dateSelection !== "auto" && (
        <details
          open={BUSINESS_POLICY.dateSelection === "required" ? true : undefined}
        >
          <summary>{t("changeArrivalOptional")}</summary>
          <div className="calendar-toolbar">
            <button
              type="button"
              aria-label={t("previousMonth")}
              disabled={disabled || month <= dates[0]?.slice(0, 7)}
              onClick={() => move(-1)}
            >
              <ChevronRight size={16} />
            </button>
            <span id={label}>
              {MONTHS[locale][index]} {digits(year)}
            </span>
            <button
              type="button"
              aria-label={t("nextMonth")}
              disabled={disabled || month >= dates.at(-1)?.slice(0, 7)}
              onClick={() => move(1)}
            >
              <ChevronLeft size={16} />
            </button>
          </div>
          <div className="calendar-week" aria-hidden="true">
            {(locale === "ar"
              ? ["أحد", "اثن", "ثلا", "أرب", "خمي", "جمع", "سبت"]
              : ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
            ).map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="calendar-days" role="group" aria-labelledby={label}>
            {Array.from({ length: offset }, (_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {Array.from({ length }, (_, i) => {
              const date = `${month}-${String(i + 1).padStart(2, "0")}`;
              const selected = date === value;
              return (
                <button
                  ref={(el) => {
                    if (el) buttons.current.set(date, el);
                    else buttons.current.delete(date);
                  }}
                  key={date}
                  type="button"
                  aria-label={labelFor(date)}
                  aria-pressed={selected}
                  data-date={date}
                  disabled={disabled || !dates.includes(date)}
                  onClick={() => onChange(date)}
                  onKeyDown={(event) => key(event, date)}
                >
                  {digits(i + 1)}
                  {selected && <Check size={11} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}
