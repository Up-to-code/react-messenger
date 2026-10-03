import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import ToolbarButton from "../ToolbarButton";
import { useLocale } from "../../lib/i18n";

export default function Modal({ title, children, onClose, className = "" }) {
  const dialog = useRef(null);
  const { locale, t } = useLocale();
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      dir={locale === "ar" ? "rtl" : "ltr"}
      aria-label={title}
      className={`modal ${className}`}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === dialog.current) onClose();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <ToolbarButton icon={X} label={t("close")} onClick={onClose} />
      </div>
      {children}
    </dialog>
  );
}
