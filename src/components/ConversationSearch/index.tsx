import { Search } from "lucide-react";
import { useLocale } from "../../lib/i18n";
import "./ConversationSearch.css";
export default function ConversationSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useLocale();
  return (
    <div className="conversation-search">
      <Search size={17} aria-hidden="true" />
      <input
        type="search"
        className="conversation-search-input"
        placeholder={t("search")}
        aria-label={t("search")}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
