"use client";
import { useState } from "react";
import { useLocale } from "../../lib/i18n";
import type { Message } from "../../lib/types";
import Modal from "../Modal";
export default function MessageDetails({
  details,
  conversationId,
  onClose,
  navigateMessage,
}: {
  details: Message;
  conversationId: string;
  onClose: () => void;
  navigateMessage: (conversationId: string, messageId: string) => void;
}) {
  const { t } = useLocale();
  const [copiedId, setCopiedId] = useState(false);
  return (
    <Modal
      title={t("messageDetails")}
      className="message-details"
      onClose={() => onClose()}
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
              details.forwarded!.conversationId,
              details.forwarded!.messageId,
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
          onClick={() => navigateMessage(conversationId, details.promptId!)}
        >
          {t("viewSource")}
        </button>
      )}
    </Modal>
  );
}
