"use client";
import { MY_USER_ID } from "../../lib/messages";
import ThreadArchive from "../Products/ThreadArchive";
import { useEffect, useMemo, useState } from "react";
import { WifiOff, Languages } from "lucide-react";
import ConversationList from "../ConversationList";
import MessageList from "../MessageList";
import Modal from "../Modal";
import MediaPreview from "../MediaPreview";
import PollComposer from "../PollComposer";
import { useLanguage } from "../../hooks/useLanguage";
import { writeOrder } from "../../lib/commerce";
import ForwardDialog from "../ForwardDialog";
import { productById, COLORS, normalizeFilters } from "../../lib/products";
import "./Motion.css";
import { displayName, LocaleContext, translate } from "../../lib/i18n";
import { useConnection } from "../../hooks/useConnection";
import { useKeyboardViewport } from "../../hooks/useKeyboardViewport";
import { useMessenger } from "../../hooks/useMessenger";
import "./Messenger.css";
import "./RichChat.css";

export default function Messenger({ initialConversation, initialMessageId }) {
  const [locale, setLocale] = useLanguage();
  const i18n = useMemo(
    () => ({ locale, t: (key, values) => translate(locale, key, values) }),
    [locale],
  );
  const { t } = i18n;
  const online = useConnection();
  const viewport = useKeyboardViewport();
  const chat = useMessenger(online, locale);
  const [selectedId, setSelectedId] = useState(
    initialConversation || "contact-1",
  );
  const [readIds, setReadIds] = useState(new Set(["contact-1"]));
  const [query, setQuery] = useState("");
  const [showConversation, setShowConversation] = useState(
    Boolean(initialConversation?.startsWith("agent")),
  );
  const [modal, setModal] = useState(null);
  const [archivedMessage, setArchivedMessage] = useState(null);
  const [name, setName] = useState("");
  const [preview, setPreview] = useState(null);

  const [forward, setForward] = useState(null);
  const [details, setDetails] = useState(null);
  const [copiedId, setCopiedId] = useState(false);
  const [focus, setFocus] = useState(
    initialMessageId
      ? { conversationId: initialConversation, messageId: initialMessageId }
      : null,
  );
  const [motion, setMotion] = useState("standard");
  const conversation = chat.conversations.find(
    (item) => item.id === selectedId,
  );
  const title = displayName(conversation, t);
  const latestChoiceMessage = [...conversation.messages]
    .reverse()
    .find(
      (message) =>
        message.productCard?.selection ||
        message.interaction?.payload?.selection,
    );
  const latestSelection =
    latestChoiceMessage?.productCard?.selection ||
    latestChoiceMessage?.interaction?.payload?.selection;
  const selectionColor =
    COLORS.find((color) => color.id === latestSelection?.color)?.hex || "#111";
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);
  function createConversation(event) {
    event.preventDefault();
    if (!name.trim()) return;
    const id = crypto.randomUUID();
    chat.dispatch({
      type: "create",
      conversation: {
        id,
        name: name.trim(),
        online: true,
        timestamp: Date.now(),
        messages: [],
      },
    });
    setSelectedId(id);
    setQuery("");
    setShowConversation(true);
    setModal(null);
    setName("");
  }
  function send(content) {
    return chat.send(selectedId, content);
  }
  function navigateMessage(conversationId, messageId) {
    if (
      !chat.conversations.some(
        (item) =>
          item.id === conversationId &&
          item.messages.some((message) => message.id === messageId),
      )
    ) {
      if (conversationId.startsWith("agent")) {
        setArchivedMessage(messageId);
        setModal("threads");
      }
      return;
    }
    setSelectedId(conversationId);
    setReadIds((ids) => new Set([...ids, conversationId]));
    setShowConversation(true);
    setFocus({ conversationId, messageId });
    setDetails(null);
  }
  function interact(sourceId, action) {
    if (action.method === "answerChoice") {
      const card = conversation.messages.find(
        (message) => message.id === sourceId,
      )?.productCard;
      if (
        card?.type !== "action-choice" ||
        !Array.isArray(action.selected) ||
        !action.selected.length ||
        (!card.multiple && action.selected.length > 1) ||
        action.selected.some(
          (id) => !card.options.some((option) => option.id === id),
        )
      )
        return false;
      const text = card.options
        .filter((option) => action.selected.includes(option.id))
        .map((option) => option.label)
        .join("، ");
      const sent = send({
        text,
        reply: { id: sourceId, name: t("agent"), text: card.question },
      });
      if (sent !== false)
        chat.dispatch({
          type: "patch",
          conversationId: selectedId,
          messageId: sourceId,
          patch: { productCard: { ...card, selected: action.selected } },
        });
      return sent;
    }
    if (action.method === "setFilter") {
      const source = conversation.messages.find(
        (message) => message.id === sourceId,
      );
      if (source?.productCard?.type !== "criterion") return false;
      try {
        chat.dispatch({
          type: "patch",
          conversationId: selectedId,
          messageId: sourceId,
          patch: {
            productCard: {
              ...source.productCard,
              filters: normalizeFilters(action.filters),
            },
          },
        });
        return true;
      } catch {
        return false;
      }
    }
    if (action.method === "setVariant") {
      const source = conversation.messages.find(
        (message) => message.id === sourceId,
      );
      const card = source?.productCard;
      if (
        card?.type !== "variant" ||
        !productById(card.productId).variants.includes(action.variant)
      )
        return;
      chat.dispatch({
        type: "patch",
        conversationId: selectedId,
        messageId: sourceId,
        patch: { productCard: { ...card, variant: action.variant } },
      });
      return;
    }

    if (action.method === "selectProduct" && !action.direct) {
      return send({
        interaction: { method: "requestOptions", sourceId, payload: action },
      });
    }
    if (
      ["chooseDelivery", "chooseExtras"].includes(action.method) &&
      !action.direct
    ) {
      return send({
        interaction: {
          method:
            action.method === "chooseDelivery"
              ? "requestDelivery"
              : "requestExtras",
          sourceId,
          payload: action,
        },
      });
    }
    if (action.method === "submitOrder") {
      try {
        const order = writeOrder({
          id: crypto.randomUUID(),
          sourceId,
          conversationId: selectedId,
          selection: action.selection,
          customer: action.customer,
          createdAt: Date.now(),
          status: "draft",
        });
        return send({
          interaction: { method: "reviewOrder", sourceId, payload: { order } },
        });
      } catch {
        return false;
      }
    }
    setFocus(null);
    return send({
      interaction: { method: action.method, sourceId, payload: action },
    });
  }
  function forwardTo(targetId) {
    const data = forward.message;
    const success = chat.send(targetId, {
      text: data.message,
      attachment: data.attachment,
      productCard: data.productCard,
      poll: data.poll ? { ...data.poll, vote: null } : null,
      forwarded: {
        conversationId: forward.conversationId,
        messageId: data.id,
        name: forward.name,
      },
    });
    if (success) {
      setForward(null);
      setSelectedId(targetId);
      setReadIds((ids) => new Set([...ids, targetId]));
      setFocus(null);
      setShowConversation(true);
    }
  }
  return (
    <LocaleContext.Provider value={i18n}>
      <main
        ref={viewport}
        style={{ "--selection-color": selectionColor }}
        data-selected-color={latestSelection?.color || "none"}
        data-memory={chat.memory.status}
        data-motion={motion}
        lang={locale}
        dir={locale === "ar" ? "rtl" : "ltr"}
        className={`messenger ${showConversation ? "show-conversation" : ""} ${online ? "" : "is-offline"}`}
      >
        {!online && (
          <div className="offline-banner" role="status">
            <WifiOff size={16} />
            <span>{t("offlineBanner")}</span>
          </div>
        )}
        <aside className="sidebar">
          <ConversationList
            conversations={chat.conversations}
            selectedId={selectedId}
            readIds={readIds}
            query={query}
            onQueryChange={setQuery}
            onSelect={(id) => {
              setFocus(null);
              setSelectedId(id);
              setReadIds((ids) => new Set([...ids, id]));
              setShowConversation(true);
            }}
            onNew={() => {
              setName("");
              setModal("new");
            }}
            onSettings={() => setModal("settings")}
            onLanguage={() =>
              setLocale((value) => (value === "en" ? "ar" : "en"))
            }
            online={online}
          />
        </aside>
        <div className="content">
          <MessageList
            key={selectedId}
            conversation={conversation}
            onSend={send}
            onBack={() => setShowConversation(false)}
            onInfo={() => setModal("info")}
            onThreads={() => {
              setArchivedMessage(null);
              setModal("threads");
            }}
            onPreview={setPreview}
            onPoll={() => setModal("poll")}
            onBrowse={() => interact(null, { method: "showProducts" })}
            onProductAction={interact}
            onForward={(message) =>
              setForward({ message, conversationId: selectedId, name: title })
            }
            onDetails={(message) => {
              setDetails(message);
              setCopiedId(false);
            }}
            onNavigate={navigateMessage}
            focusId={
              focus?.conversationId === selectedId ? focus.messageId : null
            }
            onReact={(messageId, emoji) =>
              chat.dispatch({
                type: "react",
                conversationId: selectedId,
                messageId,
                emoji,
              })
            }
            onVote={(messageId, optionId) => {
              const message = conversation.messages.find(
                (item) => item.id === messageId,
              );
              if (
                conversation.kind === "agent" &&
                message?.author === "agent" &&
                message.poll.vote !== optionId
              ) {
                const option = message.poll.options.find(
                  (item) => item.id === optionId,
                );
                if (
                  !option ||
                  send({
                    text: option.label,
                    reply: {
                      id: messageId,
                      name: title,
                      text: message.poll.question,
                    },
                  }) === false
                )
                  return;
              }
              chat.dispatch({
                type: "vote",
                conversationId: selectedId,
                messageId,
                optionId,
              });
            }}
            onRetry={(messageId) => chat.retry(selectedId, messageId)}
            busy={chat.activeAgent === selectedId}
            onStop={chat.stop}
            online={online}
          />
        </div>
        {modal === "poll" && (
          <PollComposer
            onClose={() => setModal(null)}
            onCreate={(poll) => {
              if (send({ poll, text: poll.question })) setModal(null);
            }}
          />
        )}
        {modal === "threads" && (
          <ThreadArchive
            conversationId={selectedId}
            initialMessage={archivedMessage}
            onClose={() => setModal(null)}
            onSelect={async (id, title) => {
              if (!chat.conversations.some((c) => c.id === id)) {
                const response = await fetch(`/api/threads?id=${encodeURIComponent(id)}`);
                if (!response.ok) throw new Error("Archive unavailable");
                const data = await response.json();

                chat.dispatch({ type: "create", conversation: {
                  id, kind: "agent", name: title, online: true,
                  timestamp: data.messages.at(-1)?.timestamp || Date.now(),
                  messages: data.messages.map((row) => ({
                    id: row.id, author: row.role === "user" ? MY_USER_ID : "agent",
                    message: row.text, timestamp: row.timestamp, status: "complete",
                  })),
                }});
              }
              setSelectedId(id);
              setShowConversation(true);
            }}
            onCreate={(title) => {
              const id = `agent-${crypto.randomUUID()}`;
              chat.dispatch({
                type: "create",
                conversation: {
                  id,
                  kind: "agent",
                  name: title,
                  online: true,
                  timestamp: Date.now(),
                  messages: [],
                },
              });
              setSelectedId(id);
              setShowConversation(true);
              setQuery("");
            }}
          />
        )}
        {modal && modal !== "poll" && modal !== "threads" && (
          <Modal
            title={
              modal === "new"
                ? t("newChat")
                : modal === "info"
                  ? t("info")
                  : t("settings")
            }
            onClose={() => setModal(null)}
          >
            {modal === "new" ? (
              <form onSubmit={createConversation}>
                <label htmlFor="contact-name">{t("contactName")}</label>
                <input
                  id="contact-name"
                  dir="auto"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={80}
                  required
                />
                <button
                  className="primary-button"
                  type="submit"
                  disabled={!name.trim()}
                >
                  {t("createChat")}
                </button>
              </form>
            ) : modal === "info" ? (
              <>
                <p>
                  <strong>{title}</strong>
                </p>
                <p>
                  {t("messageCount", { count: conversation.messages.length })}
                </p>
                <p>
                  {conversation.kind === "agent"
                    ? t(chat.agentMode === "demo" ? "demoAgent" : "liveAgent")
                    : t("localNote")}
                </p>
              </>
            ) : (
              <>
                <h3>{t("aboutTitle")}</h3>
                <p>{t("about")}</p>
                <button
                  type="button"
                  className="settings-language"
                  onClick={() =>
                    setLocale((value) => (value === "en" ? "ar" : "en"))
                  }
                >
                  <Languages size={19} />
                  {t("language")} · {locale === "ar" ? "English" : "العربية"}
                </button>
                <p className="settings-note">{t("localNote")}</p>
                <p className="memory-status" role="status">
                  {t(
                    {
                      saved: "memorySaved",
                      saving: "memorySaving",
                      unavailable: "memoryUnavailable",
                      loading: "memoryLoading",
                    }[chat.memory.status],
                  )}
                </p>
                <p role="status">
                  {t(
                    chat.archiveStatus === "saved"
                      ? "archiveSaved"
                      : chat.archiveStatus === "unavailable"
                        ? "archiveUnavailable"
                        : "memoryLoading",
                  )}
                </p>
                <fieldset>
                  <legend>{t("motion")}</legend>
                  <div className="motion-options">
                    {["slow", "standard", "quick"].map((value) => (
                      <label key={value}>
                        <input
                          type="radio"
                          name="motion"
                          checked={motion === value}
                          onChange={() => setMotion(value)}
                        />
                        {t(
                          {
                            slow: "motionSlow",
                            standard: "motionStandard",
                            quick: "motionQuick",
                          }[value],
                        )}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </>
            )}
          </Modal>
        )}
        {forward && (
          <ForwardDialog
            conversations={chat.conversations}
            disabled={!!chat.activeAgent || !chat.memory.ready}
            onClose={() => setForward(null)}
            onForward={forwardTo}
          />
        )}
        {details && (
          <Modal
            title={t("messageDetails")}
            className="message-details"
            onClose={() => setDetails(null)}
          >
            <p>{t("messageId")}</p>
            <code>{details.id}</code>
            <button
              type="button"
              className="product-secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(details.id);
                  setCopiedId(true);
                } catch {
                  setCopiedId(false);
                }
              }}
            >
              {t(copiedId ? "copied" : "copyId")}
            </button>
            {details.forwarded && (
              <button
                type="button"
                className="product-secondary"
                onClick={() =>
                  navigateMessage(
                    details.forwarded.conversationId,
                    details.forwarded.messageId,
                  )
                }
              >
                {t("viewSource")}
              </button>
            )}
            {details.promptId && (
              <button
                type="button"
                className="product-secondary"
                onClick={() => navigateMessage(selectedId, details.promptId)}
              >
                {t("viewSource")}
              </button>
            )}
          </Modal>
        )}
        {preview && (
          <MediaPreview attachment={preview} onClose={() => setPreview(null)} />
        )}
      </main>
    </LocaleContext.Provider>
  );
}
