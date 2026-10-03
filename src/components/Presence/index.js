import { useLocale } from "../../lib/i18n";
export default function Presence({ online }) {
  const { t } = useLocale();
  return (
    <span className={`presence ${online ? "is-online" : ""}`}>
      <span className="presence-dot" aria-hidden="true" />
      {t(online ? "online" : "activeRecently")}
    </span>
  );
}
export function TypingIndicator({ name, agent = false }) {
  const { t } = useLocale();
  return (
    <div
      className="typing-indicator"
      role="status"
      aria-label={agent ? t("writing") : t("typing", { name })}
    >
      <span className="typing-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="visually-hidden">
        {agent ? t("writing") : t("typing", { name })}
      </span>
    </div>
  );
}
