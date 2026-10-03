import type * as T from "../../lib/types";
import { useState } from "react";
import Modal from "../Modal";
import { useLocale } from "../../lib/i18n";
// This handles single/multiple choices, independently from poll creation or voting.
export default function ChoiceDialog({
  title,
  mode,
  options,
  value,
  onChoose,
  onClose,
  disabled,
}: {
  title: string;
  mode: "single" | "multiple";
  options: T.NamedOption[];
  value: string | string[];
  onChoose: (value: string | string[]) => void;
  onClose: () => void;
  disabled?: boolean;
}) {
  const { t, locale } = useLocale();
  const [selected, setSelected] = useState(
    mode === "multiple" ? [...value] : value,
  );
  return (
    <Modal title={title} onClose={onClose} className="choice-modal">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onChoose(selected);
        }}
      >
        <fieldset>
          <legend>
            {t(mode === "multiple" ? "chooseMultiple" : "chooseOne")}
          </legend>
          <div className="choice-options">
            {options.map((option) => {
              const checked =
                mode === "multiple"
                  ? selected.includes(option.id)
                  : selected === option.id;
              return (
                <label key={option.id} className={checked ? "chosen" : ""}>
                  <input
                    type={mode === "multiple" ? "checkbox" : "radio"}
                    name="choice"
                    checked={checked}
                    value={option.id}
                    onChange={() =>
                      setSelected(
                        mode === "multiple"
                          ? checked
                            ? (Array.isArray(selected) ? selected : []).filter(
                                (id) => id !== option.id,
                              )
                            : [...selected, option.id]
                          : option.id,
                      )
                    }
                  />
                  {option[locale]}
                </label>
              );
            })}
          </div>
        </fieldset>
        <button className="primary-button" type="submit" disabled={disabled}>
          {t("continueChoice")}
        </button>
      </form>
    </Modal>
  );
}
