import type * as T from "../../lib/types";
import Modal from "../Modal";
import ColorOptions from "./ColorOptions";
import { useLocale } from "../../lib/i18n";
export default function ProductOptionsDialog({
  onClose,
  ...props
}: {
  onClose: () => void;
  productId: string;
  selection?: T.Selection;
  onSelect: (selection: T.Selection) => void;
  disabled?: boolean;
  variantOverride?: string;
}) {
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
