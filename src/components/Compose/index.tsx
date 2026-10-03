import type * as React from "react";
import type * as T from "../../lib/types";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ImagePlus,
  Smile,
  Send,
  X,
  Plus,
  ChartNoAxesColumn,
  Square,
  ShoppingBag,
} from "lucide-react";
import ToolbarButton from "../ToolbarButton";
import EmojiPicker from "../EmojiPicker";
import { useLocale } from "../../lib/i18n";
import "./Compose.css";

export default function Compose({
  onSend,
  reply,
  onCancelReply,
  onPoll,
  onBrowse,
  busy,
  onStop,
  onPreview,
  queued,
}: {
  onSend: T.Send;
  reply: T.Reply | null;
  onCancelReply: () => void;
  onPoll: () => void;
  onBrowse: (method?: string) => void;
  busy?: boolean;
  onStop: () => void;
  onPreview: (attachment: T.Attachment) => void;
  queued?: boolean;
  agent?: boolean;
}) {
  const { t } = useLocale();
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<T.Attachment | null>(null);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [panel, setPanel] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const input = useRef<HTMLTextAreaElement | null>(null);
  const reader = useRef<FileReader | null>(null);
  useEffect(
    () => () => {
      if (reader.current?.readyState === 1) reader.current.abort();
    },
    [],
  );
  useEffect(() => {
    if (reply) input.current?.focus();
  }, [reply]);
  function resize() {
    const element = input.current;
    if (element) {
      element.style.height = "auto";
      element.style.height = `${Math.min(element.scrollHeight + 2, 120)}px`;
    }
  }
  function submit(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (reading || busy || queued || (!text.trim() && !attachment)) return;
    if (onSend({ text: text.trim(), attachment, reply }) === false) return;
    setText("");
    setAttachment(null);
    setError("");
    setPanel(null);
    onCancelReply();
    if (input.current) {
      input.current.style.height = "44px";
      input.current.focus({ preventScroll: true });
    }
  }
  function attach(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
        file.type,
      ) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError(t("imageError"));
      return;
    }
    setReading(true);
    setError("");
    setPanel(null);
    const nextReader = new FileReader();
    reader.current = nextReader;
    nextReader.onload = () => {
      if (typeof nextReader.result !== "string") {
        setError(t("readError"));
        setReading(false);
        return;
      }
      setAttachment({ name: file.name, url: nextReader.result });
      setReading(false);
    };
    nextReader.onerror = () => {
      setError(t("readError"));
      setReading(false);
    };
    nextReader.readAsDataURL(file);
  }
  return (
    <form
      className="compose"
      onSubmit={submit}
      onKeyDown={(event) => {
        if (event.key === "Escape") setPanel(null);
      }}
    >
      {reply && (
        <div className="reply-preview">
          <div>
            <strong>{t("replying", { name: reply.name })}</strong>
            <span dir="auto">{reply.text}</span>
          </div>
          <ToolbarButton
            icon={X}
            label={t("cancelReply")}
            onClick={onCancelReply}
          />
        </div>
      )}
      {attachment && (
        <div className="attachment-preview">
          <button
            type="button"
            aria-label={t("previewImage", { name: attachment.name })}
            onClick={() => onPreview(attachment)}
          >
            <Image
              src={attachment.url}
              width={72}
              height={72}
              alt={attachment.name}
              unoptimized
            />
          </button>
          <span dir="auto">{attachment.name}</span>
          <ToolbarButton
            icon={X}
            label={t("removeAttachment")}
            onClick={() => setAttachment(null)}
          />
        </div>
      )}
      {(error || reading) && (
        <div className="compose-feedback">
          {reading && <span role="status">{t("reading")}</span>}
          {error && <span role="alert">{error}</span>}
        </div>
      )}
      <div className="compose-row">
        <div className="composer-menu-anchor">
          <button
            type="button"
            className="toolbar-button"
            aria-label={t("more")}
            title={t("more")}
            aria-expanded={panel === "more"}
            onClick={() =>
              setPanel((value) => (value === "more" ? null : "more"))
            }
          >
            <Plus size={25} />
          </button>
          {panel === "more" && (
            <div className="composer-popover more-menu">
              <button
                type="button"
                disabled={busy || queued}
                onClick={() => {
                  setPanel(null);
                  onBrowse();
                }}
              >
                <ShoppingBag size={20} />
                {t("browseProducts")}
              </button>
              <button
                type="button"
                disabled={busy || queued}
                onClick={() => {
                  setPanel(null);
                  onSend({ text: t("productFilters") });
                }}
              >
                <ShoppingBag size={20} />
                {t("productFilters")}
              </button>
              <button type="button" onClick={() => fileInput.current?.click()}>
                <ImagePlus size={20} />
                {t("attach")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPanel(null);
                  onPoll();
                }}
              >
                <ChartNoAxesColumn size={20} />
                {t("createPoll")}
              </button>
            </div>
          )}
        </div>
        <textarea
          ref={input}
          rows={1}
          dir="auto"
          className="compose-input"
          placeholder={t("placeholder")}
          aria-label={t("message")}
          value={text}
          maxLength={10000}
          onChange={(event) => {
            setText(event.target.value);
            resize();
          }}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              submit(event);
            }
          }}
        />
        <input
          ref={fileInput}
          type="file"
          className="visually-hidden"
          accept="image/jpeg,image/png,image/webp,image/gif"
          aria-label={t("attachInput")}
          onChange={attach}
          disabled={reading}
        />
        <div className="composer-menu-anchor">
          <button
            type="button"
            className="toolbar-button"
            aria-label={t("emoji")}
            title={t("emoji")}
            aria-expanded={panel === "emoji"}
            onClick={() =>
              setPanel((value) => (value === "emoji" ? null : "emoji"))
            }
          >
            <Smile size={25} />
          </button>
          {panel === "emoji" && (
            <EmojiPicker
              onPick={(emoji) => {
                setText((value) => value + emoji);
                setPanel(null);
                input.current?.focus({ preventScroll: true });
              }}
            />
          )}
        </div>
        {busy ? (
          <ToolbarButton
            icon={Square}
            label={t("stop")}
            className="stop-button"
            onClick={onStop}
          />
        ) : (
          <button
            type="submit"
            className="toolbar-button send-button"
            aria-label={t("send")}
            title={t("send")}
            disabled={reading || queued || (!text.trim() && !attachment)}
          >
            <Send size={24} />
          </button>
        )}
      </div>
      <div className="composer-hint">
        {queued ? (
          t("sendingOffline")
        ) : (
          <>
            <span className="desktop-hint">{t("shortcuts")}</span>
            <span className="mobile-hint">{t("mobileShortcuts")}</span>
          </>
        )}
      </div>
    </form>
  );
}
