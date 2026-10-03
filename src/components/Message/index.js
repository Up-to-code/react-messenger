import Image from "next/image";
import { Check, CheckCheck, Clock, RotateCcw } from "lucide-react";
import { formatTimestamp } from "../../lib/messages";
import { useLocale } from "../../lib/i18n";
import PollCard from "../PollCard";
import ProductCard from "../Products";
import { Forward, CornerUpLeft } from "lucide-react";
import MessageActions from "../MessageActions";
import { TypingIndicator } from "../Presence";
import "./Message.css";

export default function Message({
  data,
  isMine,
  startsSequence,
  endsSequence,
  showTimestamp,
  onReply,
  onReact,
  onVote,
  onPreview,
  onRetry,
  onForward,
  onDetails,
  onProductAction,
  onNavigate,
  conversationId,
  focused,
  busy,
  appliedSelection,
  variantOverride,
  filterValues,
}) {
  const { locale, t } = useLocale();
  const friendlyTimestamp = formatTimestamp(data.timestamp, locale);
  const pending =
    data.author === "agent" &&
    !data.message &&
    ["thinking", "streaming"].includes(data.status);
  return (
    <article
      id={`message-${data.id}`}
      data-message-id={data.id}
      className={[
        "message",
        data.motion ? "motion-message" : "",
        focused ? "focused-message" : "",
        isMine ? "mine" : "",
        startsSequence ? "start" : "",
        endsSequence ? "end" : "",
        data.author === "agent" ? "agent-message" : "",
        data.status === "sending" ? "sending-message" : "",
      ].join(" ")}
    >
      {showTimestamp && (
        <time
          className="timestamp"
          dateTime={new Date(data.timestamp).toISOString()}
        >
          {friendlyTimestamp}
        </time>
      )}
      {pending ? (
        <TypingIndicator agent />
      ) : (
        <>
          {(data.message ||
            data.messageKey ||
            data.poll ||
            data.attachment ||
            data.forwarded ||
            data.reply ||
            data.references?.length ||
            data.error ||
            data.status === "stopped") && (
            <div className="bubble-container">
              <div
                className={`bubble ${data.poll ? "poll-bubble" : ""} `}
                title={friendlyTimestamp}
              >
                {data.forwarded && (
                  <button
                    className="forwarded-reference"
                    type="button"
                    onClick={() =>
                      onNavigate(
                        data.forwarded.conversationId,
                        data.forwarded.messageId,
                      )
                    }
                  >
                    <Forward size={13} />
                    {t("forwardedFrom", { name: data.forwarded.name })}
                  </button>
                )}
                {data.reply && (
                  <button
                    className="quoted-message"
                    type="button"
                    onClick={() =>
                      document
                        .getElementById(`message-${data.reply.id}`)
                        ?.scrollIntoView({
                          block: "center",
                          behavior: "smooth",
                        })
                    }
                  >
                    <strong>{data.reply.name}</strong>
                    <span dir="auto">{data.reply.text}</span>
                  </button>
                )}
                {data.attachment && (
                  <button
                    type="button"
                    className="message-image-button"
                    aria-label={t("previewImage", {
                      name: data.attachment.name,
                    })}
                    onClick={() => onPreview(data.attachment)}
                  >
                    <Image
                      className="message-image"
                      src={data.attachment.url}
                      alt={data.attachment.name}
                      width={320}
                      height={240}
                      unoptimized
                    />
                  </button>
                )}
                {data.poll ? (
                  <PollCard poll={data.poll} onVote={onVote} />
                ) : (
                  <div className="message-text" dir="auto">
                    {data.messageKey ? t(data.messageKey) : data.message}
                  </div>
                )}
                {data.references?.map((id) => (
                  <button
                    className="message-reference"
                    key={id}
                    type="button"
                    onClick={() => onNavigate(conversationId, id)}
                  >
                    <CornerUpLeft size={13} />
                    {t("viewReference")}
                  </button>
                ))}
                {data.error && (
                  <div className="message-error" role="alert">
                    {t("agentError")}
                    <button type="button" onClick={onRetry} disabled={busy}>
                      <RotateCcw size={14} />
                      {t("retry")}
                    </button>
                  </div>
                )}
                {data.status === "stopped" && (
                  <div className="stopped-label">
                    {t("stopped")}{" "}
                    <button type="button" onClick={onRetry} disabled={busy}>
                      {t("retry")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          {data.productCard && (
            <div
              className={`generative-surface ${isMine ? "mine-surface" : ""}`}
            >
              <ProductCard
                card={data.productCard}
                onActionChoice={(selected) =>
                  onProductAction(data.id, { method: "answerChoice", selected })
                }
                filterValues={filterValues}
                onFilterChange={(filters) =>
                  onProductAction(data.id, { method: "setFilter", filters })
                }
                onFilter={(filters) =>
                  onProductAction(data.id, {
                    method: "filterProducts",
                    filters,
                  })
                }
                appliedSelection={appliedSelection}
                variantOverride={variantOverride}
                onVariant={(variant) =>
                  onProductAction(data.id, { method: "setVariant", variant })
                }
                disabled={busy}
                onChoose={(productId, selection, direct = false) =>
                  onProductAction(data.id, {
                    method: "selectProduct",
                    productId,
                    selection,
                    direct,
                  })
                }
                onSelectProducts={(productIds) =>
                  onProductAction(data.id, {
                    method: "selectProducts",
                    productIds,
                  })
                }
                onCompare={(productIds) =>
                  onProductAction(data.id, {
                    method: "compareProducts",
                    productIds,
                  })
                }
                onDeliveryChoice={(selection) =>
                  onProductAction(data.id, {
                    method: "chooseDelivery",
                    selection,
                    direct: true,
                  })
                }
                onExtrasChoice={(selection) =>
                  onProductAction(data.id, {
                    method: "chooseExtras",
                    selection,
                    direct: true,
                  })
                }
                onCheckout={(selection) =>
                  onProductAction(data.id, {
                    method: "beginCheckout",
                    selection,
                  })
                }
                onOrder={(selection, customer) =>
                  onProductAction(data.id, {
                    method: "submitOrder",
                    selection,
                    customer,
                  })
                }
                onDelivery={(selection) =>
                  onProductAction(data.id, {
                    method: "chooseDelivery",
                    selection,
                  })
                }
                onExtras={(selection) =>
                  onProductAction(data.id, {
                    method: "chooseExtras",
                    selection,
                  })
                }
                onConfirm={(selection) =>
                  onProductAction(data.id, {
                    method: "confirmSelection",
                    selection,
                  })
                }
              />
            </div>
          )}
          <div className="message-meta">
            {data.reaction && (
              <button
                className="reaction-pill"
                type="button"
                aria-label={t("removeReaction", { emoji: data.reaction })}
                onClick={() => onReact(data.reaction)}
              >
                {data.reaction} <span>1</span>
              </button>
            )}
            <MessageActions
              data={data}
              onReply={onReply}
              onReact={onReact}
              onForward={onForward}
              onDetails={onDetails}
              agent={data.author === "agent"}
            />
            {isMine && endsSequence && data.status && (
              <span
                className={`delivery-state ${data.status}`}
                role="status"
                aria-label={t(data.status)}
              >
                {data.status === "queued" || data.status === "sending" ? (
                  <Clock size={12} />
                ) : data.status === "read" || data.status === "delivered" ? (
                  <CheckCheck size={14} />
                ) : (
                  <Check size={14} />
                )}
                {t(data.status)}
              </span>
            )}
          </div>
        </>
      )}
    </article>
  );
}
