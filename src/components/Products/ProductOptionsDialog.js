import Modal from "../Modal";
import ColorOptions from "./ColorOptions";
import { useLocale } from "../../lib/i18n";
export default function ProductOptionsDialog({ onClose, ...props }) {
  const { t } = useLocale();
  return (
    <Modal
      title={t("productOptions")}
      onClose={onClose}
      className="product-options-modal"
    >
      <ColorOptions {...props} />
    </Modal>
  );
}
