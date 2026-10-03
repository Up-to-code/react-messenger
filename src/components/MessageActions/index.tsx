import type * as T from "../../lib/types";
import { useState } from "react";
import {
  Reply,
  SmilePlus,
  Copy,
  Check,
  Forward,
  MoreHorizontal,
} from "lucide-react";
import ToolbarButton from "../ToolbarButton";
import { useLocale } from "../../lib/i18n";

export default function MessageActions({
  data,
  onReply,
  onReact,
  onForward,
  onDetails,
  agent,
}: {
  data: T.Message;
  onReply: () => void;
  onReact: (emoji: string) => void;
  onForward: () => void;
  onDetails: () => void;
  agent: boolean;
}) {
  const { t } = useLocale();
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <div
      className="message-actions"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setShow(false);
          event.stopPropagation();
        }
      }}
    >
      <ToolbarButton icon={Reply} label={t("reply")} onClick={onReply} />
      <ToolbarButton
        icon={SmilePlus}
        label={t("react")}
        onClick={() => setShow((value) => !value)}
      />
      <ToolbarButton
        icon={Forward}
        label={t("forwardMessage")}
        onClick={onForward}
      />
      <ToolbarButton
        icon={MoreHorizontal}
        label={t("messageDetails")}
        onClick={onDetails}
      />
      {agent && data.message && (
        <ToolbarButton
          icon={copied ? Check : Copy}
          label={t(copied ? "copied" : "copy")}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(data.message);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        />
      )}
      {show && (
        <div className="reaction-picker" role="group" aria-label={t("react")}>
          {["❤️", "👍", "😂", "😮", "😢", "🎉"].map((emoji) => (
            <button
              type="button"
              key={emoji}
              aria-label={`${t("react")} ${emoji}`}
              onClick={() => {
                onReact(emoji);
                setShow(false);
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
