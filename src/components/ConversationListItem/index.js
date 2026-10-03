import Image from "next/image";
import { formatClock } from "../../lib/messages";
import { displayName, useLocale } from "../../lib/i18n";
import "./ConversationListItem.css";
export default function ConversationListItem({
  data,
  selected,
  onSelect,
  online,
  unread,
}) {
  const { t, locale } = useLocale();
  const name = displayName(data, t);
  const last = data.messages.at(-1);
  return (
    <button
      type="button"
      className={`conversation-list-item ${selected ? "selected" : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={t("openChat", { name })}
    >
      <span className="avatar-wrap">
        {data.photo ? (
          <Image
            className="conversation-photo"
            src={data.photo}
            width={48}
            height={48}
            alt=""
          />
        ) : (
          <span className="conversation-photo initials" aria-hidden="true">
            {name
              .split(" ")
              .map((part) => part[0])
              .slice(0, 2)
              .join("")}
          </span>
        )}
        {online && data.online && (
          <span className="avatar-online" aria-hidden="true" />
        )}
      </span>
      <span className="conversation-info">
        <span className="conversation-title" dir="auto">
          {name}
        </span>
        <span
          className={`conversation-snippet ${data.typing ? "typing-snippet" : ""}`}
          dir="auto"
        >
          {data.typing
            ? t("typing", { name })
            : (last?.messageKey ? t(last.messageKey) : last?.message) ||
              (last?.poll
                ? t("poll")
                : last?.attachment
                  ? t("photo")
                  : data.kind === "agent"
                    ? t("agentDescription")
                    : t("emptyChat", { name }))}
        </span>
      </span>
      <span className="conversation-trailing">
        <time
          dateTime={new Date(last?.timestamp || data.timestamp).toISOString()}
        >
          {formatClock(last?.timestamp || data.timestamp, locale)}
        </time>
        {!!unread && (
          <span
            className="unread-count"
            aria-label={t("unread", { count: unread })}
          >
            {unread}
          </span>
        )}
      </span>
    </button>
  );
}
