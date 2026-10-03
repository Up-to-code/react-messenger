import type * as T from "../../lib/types";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Info, ArrowLeft, ArrowDown, History } from "lucide-react";
import Compose from "../Compose";
import Toolbar from "../Toolbar";
import ToolbarButton from "../ToolbarButton";
import Message from "../Message";
import Presence, { TypingIndicator } from "../Presence";
import { groupMessages } from "../../lib/messages";
import { validSelection } from "../../lib/products";
import { displayName, useLocale } from "../../lib/i18n";
import "./MessageList.css";

export default function MessageList({
  conversation,
  onSend,
  onBack,
  onInfo,
  onThreads,
  onPreview,
  onPoll,
  onBrowse,
  onForward,
  onDetails,
  onProductAction,
  onNavigate,
  focusId,
  onReact,
  onVote,
  onRetry,
  busy,
  onStop,
  online,
}: {
  conversation: T.Conversation;
  onSend: T.Send;
  onBack: () => void;
  onInfo: () => void;
  onThreads: () => void;
  onPreview: (attachment: T.Attachment) => void;
  onPoll: () => void;
  onBrowse: (method?: string) => void;
  onForward: (message: T.Message) => void;
  onDetails: (message: T.Message) => void;
  onProductAction: (
    sourceId: string,
    action: T.ProductAction,
  ) => boolean | void;
  onNavigate: (conversationId: string, messageId: string) => void;
  focusId?: string | null;
  onReact: (messageId: string, emoji: string) => void;
  onVote: (messageId: string, optionId: string) => void;
  onRetry: (id: string) => void;
  busy: boolean;
  onStop: () => void;
  online: boolean;
}) {
  const { t } = useLocale();
  const name = displayName(conversation, t);
  const agent = conversation.kind === "agent";
  const [reply, setReply] = useState<T.Reply | null>(null);
  const [showJump, setShowJump] = useState(false);
  const scroller = useRef<HTMLDivElement | null>(null);
  const nearBottom = useRef(true);
  const last = conversation.messages.at(-1);
  const optionState = useMemo(() => {
    const sourceGroups = new Map(
      conversation.messages.map((message) => [
        message.id,
        message.productCard?.groupId || message.id,
      ]),
    );
    const choices = new Map<string, T.Selection>();
    const variants = new Map<string, string>();
    const filters = new Map<string, T.Filters>();
    for (const message of conversation.messages) {
      const card = message.productCard;
      if (card?.type === "criterion") {
        const previous = filters.get(card.groupId) || card.filters;
        filters.set(card.groupId, {
          ...previous,
          ...(card.field === "price"
            ? {
                minPrice: card.filters.minPrice,
                maxPrice: card.filters.maxPrice,
              }
            : { [card.field]: card.filters[card.field] }),
        });
      }
      if (card?.type === "variant") variants.set(card.groupId, card.variant);
      const action = message.interaction;
      if (
        action?.method === "selectProduct" &&
        validSelection(action.payload?.selection)
      )
        choices.set(
          sourceGroups.get(action.sourceId) || action.sourceId,
          action.payload.selection,
        );
    }
    return { choices, variants, filters };
  }, [conversation.messages]);
  useEffect(() => {
    const element = scroller.current;
    if (element && nearBottom.current) element.scrollTop = element.scrollHeight;
  }, [conversation.messages.length, last?.message, conversation.typing, busy]);
  useEffect(() => {
    if (!focusId) return;
    const frame = requestAnimationFrame(() =>
      document.getElementById(`message-${focusId}`)?.scrollIntoView({
        block: "center",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      }),
    );
    return () => cancelAnimationFrame(frame);
  }, [focusId, conversation.messages.length]);
  function submit(content: T.SendContent) {
    nearBottom.current = true;
    return onSend(content);
  }
  return (
    <section className="message-list" aria-label={t("messagesWith", { name })}>
      <Toolbar
        title={name}
        subtitle={
          <Presence
            agent={agent}
            online={online && (agent || conversation.online)}
          />
        }
        leftItems={
          <>
            <ToolbarButton
              icon={ArrowLeft}
              label={t("back")}
              className="mobile-back"
              onClick={onBack}
            />
            {conversation.photo ? (
              <Image
                className="header-avatar"
                src={conversation.photo}
                alt=""
                width={40}
                height={40}
              />
            ) : (
              <span
                className="header-avatar header-initials"
                aria-hidden="true"
              >
                {name[0]}
              </span>
            )}
          </>
        }
        rightItems={
          <>
            {agent && (
              <ToolbarButton
                icon={History}
                label={t("threads")}
                onClick={onThreads}
              />
            )}
            <ToolbarButton icon={Info} label={t("info")} onClick={onInfo} />
          </>
        }
      />
      <div
        ref={scroller}
        className="message-list-container"
        role="log"
        aria-label={t("history")}
        aria-live="polite"
        aria-relevant="additions"
        aria-busy={busy}
        onScroll={(event) => {
          const element = event.currentTarget;
          const isNear =
            element.scrollHeight - element.scrollTop - element.clientHeight <
            80;
          nearBottom.current = isNear;
          setShowJump(!isNear);
        }}
      >
        {groupMessages(conversation.messages).map((message) => (
          <Message
            key={message.data.id}
            {...message}
            busy={busy}
            appliedSelection={optionState.choices.get(
              message.data.productCard?.groupId || message.data.id,
            )}
            filterValues={optionState.filters.get(
              message.data.productCard?.groupId || message.data.id,
            )}
            variantOverride={optionState.variants.get(
              message.data.productCard?.groupId || message.data.id,
            )}
            conversationId={conversation.id}
            focused={focusId === message.data.id}
            onForward={() => onForward(message.data)}
            onDetails={() => onDetails(message.data)}
            onProductAction={(id, action) => {
              nearBottom.current = true;
              onProductAction(id, action);
            }}
            onNavigate={onNavigate}
            onReply={() =>
              setReply({
                id: message.data.id,
                name: message.isMine ? t("you") : name,
                text: (
                  message.data.message ||
                  message.data.attachment?.name ||
                  t("poll")
                ).slice(0, 180),
              })
            }
            onReact={(emoji) => onReact(message.data.id, emoji)}
            onVote={(optionId) => onVote(message.data.id, optionId)}
            onPreview={onPreview}
            onRetry={() => onRetry(message.data.id)}
          />
        ))}
        {conversation.typing && <TypingIndicator name={name} />}
        {!agent && !conversation.messages.length && (
          <p className="empty-state">{t("emptyChat", { name })}</p>
        )}
      </div>
      {showJump && (
        <button
          type="button"
          className="jump-latest"
          aria-label={t("jumpLatest")}
          onClick={() => {
            nearBottom.current = true;
            if (scroller.current)
              scroller.current.scrollTop = scroller.current.scrollHeight;
            setShowJump(false);
          }}
        >
          <ArrowDown size={18} />
          {t("jumpLatest")}
        </button>
      )}
      <Compose
        onSend={submit}
        reply={reply}
        onCancelReply={() => setReply(null)}
        onPoll={onPoll}
        onBrowse={() => {
          nearBottom.current = true;
          onBrowse();
        }}
        busy={busy}
        onStop={onStop}
        onPreview={onPreview}
        agent={agent}
        queued={
          agent &&
          conversation.messages.some((message) => message.status === "queued")
        }
      />
    </section>
  );
}
