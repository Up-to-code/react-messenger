import { useState } from "react";
import { useLocale } from "../../lib/i18n";

const emojis = [
  ["😊", "Smile ابتسامة"],
  ["😀", "Happy سعيد"],
  ["😂", "Laugh ضحك"],
  ["🥰", "Love حب"],
  ["😍", "Heart eyes إعجاب"],
  ["😎", "Cool رائع"],
  ["🥳", "Party احتفال"],
  ["🤔", "Thinking تفكير"],
  ["😅", "Sweat nervous توتر"],
  ["😭", "Cry بكاء"],
  ["😴", "Sleep نوم"],
  ["🤩", "Excited حماس"],
  ["❤️", "Heart قلب حب"],
  ["💙", "Blue heart قلب أزرق"],
  ["✨", "Sparkles نجوم"],
  ["🔥", "Fire نار"],
  ["🎉", "Celebrate احتفال"],
  ["💯", "Hundred رائع"],
  ["👍", "Thumbs up موافقة"],
  ["👏", "Clap تصفيق"],
  ["🙌", "Raised hands نجاح"],
  ["👋", "Wave مرحبا"],
  ["🙏", "Thanks شكر"],
  ["🤝", "Handshake اتفاق"],
  ["☕", "Coffee قهوة"],
  ["🍕", "Pizza بيتزا"],
  ["🍰", "Cake كيك"],
  ["🍎", "Apple تفاح"],
  ["🌸", "Flower زهرة"],
  ["🌴", "Palm نخلة"],
  ["🌞", "Sun شمس"],
  ["🌙", "Moon قمر"],
  ["🌊", "Wave sea بحر"],
  ["🐱", "Cat قطة"],
  ["🐶", "Dog كلب"],
  ["🦋", "Butterfly فراشة"],
  ["⚽", "Football كرة قدم"],
  ["🎮", "Game لعبة"],
  ["🎵", "Music موسيقى"],
  ["📚", "Books كتب"],
  ["💻", "Computer حاسوب"],
  ["✈️", "Travel سفر"],
];
export default function EmojiPicker({
  onPick,
}: {
  onPick: (emoji: string) => void;
}) {
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const filtered = emojis.filter(([emoji, label]) =>
    (emoji + label.toLowerCase()).includes(query.toLowerCase()),
  );
  return (
    <div
      className="emoji-picker composer-popover"
      role="dialog"
      aria-label={t("emoji")}
    >
      <input
        type="search"
        aria-label={t("emojiSearch")}
        placeholder={t("emojiSearch")}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="emoji-grid">
        {filtered.map(([emoji, label]) => (
          <button
            key={emoji}
            type="button"
            aria-label={emoji === "😊" ? t("emojiSmile") : `${emoji} ${label}`}
            onClick={() => onPick(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
      {!filtered.length && <p>{t("emojiNone")}</p>}
    </div>
  );
}
