import type * as T from "../../lib/types";
import { useEffect, useState } from "react";
import Modal from "../Modal";
import { useLocale } from "../../lib/i18n";
export default function ThreadArchive({
  conversationId,
  initialMessage,
  onClose,
  onSelect,
  onCreate,
}: {
  conversationId: string;
  initialMessage: string | null;
  onClose: () => void;
  onSelect: (id: string, title: string) => void | Promise<void>;
  onCreate: (title: string) => void;
}) {
  const { t } = useLocale();
  const [threads, setThreads] = useState<T.Thread[]>([]);
  const [data, setData] = useState<T.ThreadDetail | null>(null);
  const [error, setError] = useState(false);
  const [title, setTitle] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch("/api/threads", { signal: controller.signal }).then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      }),
      fetch(
        `/api/threads?id=${encodeURIComponent(conversationId)}${initialMessage ? `&message=${encodeURIComponent(initialMessage)}` : ""}`,
        { signal: controller.signal },
      ).then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      }),
    ])
      .then(([list, detail]) => {
        setThreads(list.threads);
        setData(detail);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [conversationId, initialMessage]);
  async function load(older = false) {
    if (!data) return;
    try {
      const before = older ? data.messages[0]?.sequence : null;
      const response = await fetch(
        `/api/threads?id=${encodeURIComponent(conversationId)}${before ? `&before=${before}` : ""}${query ? `&q=${encodeURIComponent(query)}` : ""}`,
      );
      if (!response.ok) throw new Error();
      const next = await response.json();
      setData({
        ...next,
        messages: older ? [...next.messages, ...data.messages] : next.messages,
      });
    } catch {
      setError(true);
    }
  }
  return (
    <Modal title={t("threads")} onClose={onClose} className="thread-archive">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (title.trim()) {
            onCreate(title.trim());
            onClose();
          }
        }}
      >
        <label>
          {t("threadTitle")}
          <input
            value={title}
            maxLength={80}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <button
          type="submit"
          className="order-primary"
          disabled={!title.trim()}
        >
          {t("newThread")}
        </button>
      </form>
      <nav aria-label={t("savedThreads")}>
        {threads.map((thread) => (
          <button
            key={thread.id}
            className="bare-action"
            onClick={async () => {
              try {
                await onSelect(thread.id, thread.title);
                onClose();
              } catch {
                setError(true);
              }
            }}
          >
            {thread.title} · {thread.count}
          </button>
        ))}
      </nav>
      {error && <p role="alert">{t("archiveUnavailable")}</p>}
      {data && (
        <>
          <p role="status">
            {t("archiveCount", { count: data.summary.count })}
          </p>
          <details className="thread-summary">
            <summary>{t("threadSummary")}</summary>
            <small>{t("extractiveNote")}</small>
            {[...data.summary.facts, ...data.summary.excerpts].map(
              (fact, i) => (
                <p key={`${fact.id}-${i}`} dir="auto">
                  <code>{fact.id}</code>
                  <br />
                  {fact.text}
                </p>
              ),
            )}
          </details>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void load();
            }}
          >
            <input
              aria-label={t("searchArchive")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button className="bare-action" type="submit">
              {t("searchArchive")}
            </button>
          </form>
          <div className="archived-messages">
            {data.messages.map((message) => (
              <details
                key={message.id}
                open={message.id === initialMessage}
                className={
                  message.id === initialMessage ? "focused-message" : ""
                }
              >
                <summary dir="auto">{message.text.slice(0, 100)}</summary>
                <p dir="auto">{message.text}</p>
                <code>{message.id}</code>
              </details>
            ))}
          </div>
          {!query && data.messages.length < data.summary.count && (
            <button className="bare-action" onClick={() => void load(true)}>
              {t("olderMessages")}
            </button>
          )}
        </>
      )}
    </Modal>
  );
}
