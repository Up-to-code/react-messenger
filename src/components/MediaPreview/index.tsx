import type * as T from "../../lib/types";
import { useState } from "react";
import Image from "next/image";
import { Download, ZoomIn, ZoomOut } from "lucide-react";
import Modal from "../Modal";
import ToolbarButton from "../ToolbarButton";
import { useLocale } from "../../lib/i18n";

export default function MediaPreview({
  attachment,
  onClose,
}: {
  attachment: T.Attachment;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const [zoom, setZoom] = useState(1);
  return (
    <Modal title={t("preview")} className="media-modal" onClose={onClose}>
      <div className="media-tools">
        <span dir="auto">{attachment.name}</span>
        <div>
          <ToolbarButton
            icon={ZoomOut}
            label={t("zoomOut")}
            onClick={() => setZoom((value) => Math.max(1, value - 0.5))}
            disabled={zoom === 1}
          />
          <span aria-live="polite">{Math.round(zoom * 100)}%</span>
          <ToolbarButton
            icon={ZoomIn}
            label={t("zoomIn")}
            onClick={() => setZoom((value) => Math.min(3, value + 0.5))}
            disabled={zoom === 3}
          />
          <a
            className="toolbar-button"
            href={attachment.url}
            download={attachment.name}
            aria-label={t("download")}
            title={t("download")}
          >
            <Download size={24} />
          </a>
        </div>
      </div>
      <div className="media-stage">
        <div
          className="media-canvas"
          style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}
        >
          <Image
            src={attachment.url}
            alt={attachment.name}
            fill
            unoptimized
            style={{ objectFit: "contain" }}
          />
        </div>
      </div>
    </Modal>
  );
}
