import {
  Settings,
  Plus,
  Languages,
  MessageCircle,
  WifiOff,
} from "lucide-react";
import ConversationSearch from "../ConversationSearch";
import ConversationListItem from "../ConversationListItem";
import ToolbarButton from "../ToolbarButton";
import { displayName, useLocale } from "../../lib/i18n";
import "./ConversationList.css";
export default function ConversationList({
  conversations,
  selectedId,
  readIds,
  query,
  onQueryChange,
  onSelect,
  onNew,
  onSettings,
  onLanguage,
  online,
}) {
  const { t, locale } = useLocale();
  const search = query.trim().toLocaleLowerCase();
  const filtered = conversations.filter(
    (item) =>
      displayName(item, t).toLocaleLowerCase().includes(search) ||
      item.messages.some((message) =>
        (message.message || message.poll?.question || "")
          .toLocaleLowerCase()
          .includes(search),
      ),
  );
  return (
    <div className="conversation-list">
      <header className="sidebar-header">
        <h1>{t("messenger")}</h1>
      </header>
      <ConversationSearch value={query} onChange={onQueryChange} />
      <nav aria-label={t("conversations")} className="contacts-scroll">
        {filtered.map((item) => (
          <ConversationListItem
            key={item.id}
            data={item}
            selected={item.id === selectedId}
            unread={readIds.has(item.id) ? 0 : item.unread}
            onSelect={() => onSelect(item.id)}
            online={online}
          />
        ))}
        {!filtered.length && <p className="empty-state">{t("noResults")}</p>}
      </nav>
      <button
        type="button"
        className="new-chat-button"
        aria-label={t("newChat")}
        title={t("newChat")}
        onClick={onNew}
      >
        <Plus size={25} />
      </button>
      <footer className="sidebar-footer">
        <div className="bottom-nav">
          <span className="nav-current" aria-label={t("chats")}>
            <MessageCircle size={19} />
          </span>
          <ToolbarButton
            icon={Languages}
            label={t("switchLanguage")}
            onClick={onLanguage}
          />
          <ToolbarButton
            icon={Settings}
            label={t("settings")}
            onClick={onSettings}
          />
        </div>
        <span className="sidebar-language">
          {locale === "ar" ? "العربية" : "English"}
        </span>
        {!online && (
          <span
            className="connection-state disconnected"
            role="status"
            aria-label={t("connection")}
          >
            <WifiOff size={15} />
            {t("offline")}
          </span>
        )}
      </footer>
    </div>
  );
}
