import type * as T from "../../lib/types";
import { useId, useState } from "react";
import { Check } from "lucide-react";
import { useLocale } from "../../lib/i18n";
export default function ActionChoices({
  card,
  disabled,
  onActionChoice,
}: {
  card: T.ProductCard & {
    type: "action-choice";
    question: string;
    options: T.ChoiceOption[];
    multiple: boolean;
    selected: string[];
  };
  disabled?: boolean;
  onActionChoice: T.ProductActions["onActionChoice"];
}) {
  const { t } = useLocale();
  const name = useId();
  const [selected, setSelected] = useState(card.selected || []);
  return (
    <section
      className="order-step-card action-choice-card"
      aria-label={card.question}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (onActionChoice(selected) !== false) return;
        }}
      >
        <fieldset>
          <legend>{card.question}</legend>
          <div className="order-choice-grid">
            {card.options.map((option) => (
              <label
                key={option.id}
                className={selected.includes(option.id) ? "checked" : ""}
              >
                <input
                  type={card.multiple ? "checkbox" : "radio"}
                  name={name}
                  aria-label={option.label}
                  checked={selected.includes(option.id)}
                  disabled={disabled}
                  onChange={() =>
                    setSelected(
                      card.multiple
                        ? selected.includes(option.id)
                          ? selected.filter((id) => id !== option.id)
                          : [...selected, option.id]
                        : [option.id],
                    )
                  }
                />
                <span>
                  {option.label}
                  <Check size={15} aria-hidden="true" />
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <button
          className="bare-action"
          type="submit"
          disabled={disabled || !selected.length}
        >
          {t("continueChoice")}
        </button>
      </form>
    </section>
  );
}
