import { useEffect, useRef, useState } from "react";
import { archiveMessages } from "../lib/thread-memory";
export function useThreadArchive(conversations, ready) {
  const saved = useRef(new Map());
  const [status, setStatus] = useState("loading");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const update = () => setRevision((n) => n + 1);
    window.addEventListener("messages-order-change", update);
    return () => window.removeEventListener("messages-order-change", update);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        // Establish an owner cookie once before saves, so concurrent writes share one owner.
        const init = await fetch("/api/threads", { signal: controller.signal });
        if (!init.ok) throw new Error();
        for (const conversation of conversations.filter(
          (item) => item.kind === "agent",
        )) {
          const body = JSON.stringify({
            id: conversation.id,
            title: conversation.name,
            messages: archiveMessages(conversation.messages),
          });
          if (saved.current.get(conversation.id) === body) continue;
          const value = JSON.parse(body);
          for (let offset = 0; offset < Math.max(1, value.messages.length); offset += 500) {
          const response = await fetch("/api/threads", {
            method: "POST",
            signal: controller.signal,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...value, messages: value.messages.slice(offset, offset + 500) }),
          });
          if (!response.ok) throw new Error();
          }
          saved.current.set(conversation.id, body);
        }
        setStatus("saved");
      } catch {
        if (!controller.signal.aborted) setStatus("unavailable");
      }
    }, 800);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [conversations, ready, revision]);
  return status;
}
