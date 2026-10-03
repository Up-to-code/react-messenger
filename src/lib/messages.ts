import type * as T from "./types";
export const MY_USER_ID = "apple";
const HOUR = 60 * 60 * 1000;

export function groupMessages(messages: T.Message[]) {
  return messages.map((data, index) => {
    const previous = messages[index - 1];
    const next = messages[index + 1];
    const follows =
      previous &&
      data.timestamp - previous.timestamp >= 0 &&
      data.timestamp - previous.timestamp < HOUR;
    const precedes =
      next &&
      next.timestamp - data.timestamp >= 0 &&
      next.timestamp - data.timestamp < HOUR;
    return {
      data,
      isMine: data.author === MY_USER_ID,
      startsSequence: !(follows && previous.author === data.author),
      endsSequence: !(precedes && next.author === data.author),
      showTimestamp: !follows,
    };
  });
}

export function arabicDigits(value: string | number) {
  return String(value).replace(/\d/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]);
}
export function formatClock(timestamp: number, locale: T.Locale = "en") {
  const date = new Date(timestamp);
  const clock = `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
  return locale === "ar" ? arabicDigits(clock) : clock;
}
export function formatTimestamp(timestamp: number, locale: T.Locale = "en") {
  if (locale === "ar") {
    const date = new Date(timestamp);
    const days = [
      "الأحد",
      "الاثنين",
      "الثلاثاء",
      "الأربعاء",
      "الخميس",
      "الجمعة",
      "السبت",
    ];
    const months = [
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
    ];
    return `${days[date.getUTCDay()]}، ${arabicDigits(date.getUTCDate())} ${months[date.getUTCMonth()]} ${arabicDigits(date.getUTCFullYear())}، ${formatClock(timestamp, locale)} UTC`;
  }
  return (
    new Intl.DateTimeFormat("en-US", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(new Date(timestamp)) + " UTC"
  );
}
