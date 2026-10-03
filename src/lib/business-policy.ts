import type * as T from "./types";
// Demo business rules. Replace these with the merchant's fulfillment capability.
export const BUSINESS_POLICY = {
  timezone: "Africa/Cairo",
  dateSelection: "optional", // auto | optional | required
  leadDays: { standard: 2, express: 1, pickup: 1 },
  cutoffHour: 14,
  workingDays: [0, 1, 2, 3, 4], // Sunday–Thursday, sample Egypt business calendar
  blackoutDates: [] as string[],
  horizonDays: 30,
};
export function dateInZone(
  date: Date = new Date(),
  timezone: string = BUSINESS_POLICY.timezone,
) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (key: string) => parts.find((item) => item.type === key)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function addDays(value: string, count: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}
export function deliveryDates(
  delivery: T.Delivery,
  now: Date = new Date(),
  policy: typeof BUSINESS_POLICY = BUSINESS_POLICY,
) {
  const today = dateInZone(now, policy.timezone);
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: policy.timezone,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now),
  );
  const lead = policy.leadDays[delivery] + (hour >= policy.cutoffHour ? 1 : 0);
  const earliest = addDays(today, lead);
  return Array.from({ length: policy.horizonDays + 1 }, (_, i) =>
    addDays(today, i),
  ).filter(
    (value) =>
      value >= earliest &&
      policy.workingDays.includes(new Date(`${value}T12:00:00Z`).getUTCDay()) &&
      !policy.blackoutDates.includes(value),
  );
}
export function automaticDeliveryDate(
  delivery: T.Delivery,
  now: Date = new Date(),
  policy: typeof BUSINESS_POLICY = BUSINESS_POLICY,
) {
  return deliveryDates(delivery, now, policy)[0] || "";
}
