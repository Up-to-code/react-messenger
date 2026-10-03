import type * as T from "../../lib/types";
import { useState } from "react";
import Modal from "../Modal";
import { displayName, useLocale } from "../../lib/i18n";
export default function ForwardDialog({
  conversations,
  onForward,
  onClose,
  disabled,
}: {
  conversations: T.Conversation[];
  onForward: (id: string) => void;
  onClose: () => void;
  disabled?: boolean;
}) {
  const { t } = useLocale();
  const [id, setId] = useState("agent");
  return (
    <Modal title={t("forwardMessage")} onClose={onClose}>
      <form
        className="forward-form"
        onSubmit={(event) => {
          event.preventDefault();
          onForward(id);
        }}
      >
        <fieldset>
          <legend>{t("sendTo")}</legend>
          {conversations.map((conversation) => (
            <label key={conversation.id}>
              <input
                type="radio"
                name="forward-target"
                checked={id === conversation.id}
                onChange={() => setId(conversation.id)}
              />
              {displayName(conversation, t)}
            </label>
          ))}
        </fieldset>
        <button className="primary-button" type="submit" disabled={disabled}>
          {t("forwardMessage")}
        </button>
      </form>
    </Modal>
  );
}
