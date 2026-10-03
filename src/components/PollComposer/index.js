import { useState } from "react";
import { Plus, X } from "lucide-react";
import Modal from "../Modal";
import ToolbarButton from "../ToolbarButton";
import { validPoll } from "../../lib/chat-state";
import { useLocale } from "../../lib/i18n";

export default function PollComposer({ onCreate, onClose }) {
  const { t } = useLocale();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [error, setError] = useState(false);
  function submit(event) {
    event.preventDefault();
    if (!validPoll(question, options)) {
      setError(true);
      return;
    }
    onCreate({
      question: question.trim(),
      options: options
        .filter((value) => value.trim())
        .map((label) => ({ id: crypto.randomUUID(), label: label.trim() })),
      vote: null,
    });
  }
  return (
    <Modal title={t("createPoll")} onClose={onClose}>
      <form className="poll-form" onSubmit={submit}>
        <label htmlFor="poll-question">{t("question")}</label>
        <input
          id="poll-question"
          value={question}
          placeholder={t("pollQuestion")}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={160}
          required
        />
        {options.map((value, index) => (
          <div key={index} className="poll-option-editor">
            <div>
              <label htmlFor={`poll-option-${index}`}>
                {t("option", { number: index + 1 })}
              </label>
              <input
                id={`poll-option-${index}`}
                value={value}
                maxLength={80}
                onChange={(event) =>
                  setOptions((items) =>
                    items.map((item, i) =>
                      i === index ? event.target.value : item,
                    ),
                  )
                }
                required={index < 2}
              />
            </div>
            {options.length > 2 && (
              <ToolbarButton
                icon={X}
                label={t("removeOption", { number: index + 1 })}
                onClick={() =>
                  setOptions((items) => items.filter((_, i) => index !== i))
                }
              />
            )}
          </div>
        ))}
        {options.length < 5 && (
          <button
            className="text-button"
            type="button"
            onClick={() => setOptions((items) => [...items, ""])}
          >
            <Plus size={16} />
            {t("addOption")}
          </button>
        )}
        {error && <p role="alert">{t("pollError")}</p>}
        <button className="primary-button" type="submit">
          {t("createPoll")}
        </button>
      </form>
    </Modal>
  );
}
