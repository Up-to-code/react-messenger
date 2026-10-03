import { useEffect, useRef, useState } from "react";
import {
  openChatDatabase,
  readChatDatabase,
  writeChatDatabase,
  normalizeStoredChat,
} from "../lib/chat-storage";
export function useChatMemory(conversations, dispatch) {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("loading");
  const [savedSnapshot, setSavedSnapshot] = useState(null);
  const database = useRef(null);
  const latest = useRef(conversations);
  useEffect(() => {
    latest.current = conversations;
  }, [conversations]);
  useEffect(() => {
    let alive = true;
    let connection;
    async function restore() {
      try {
        connection = await openChatDatabase();
        const stored = await readChatDatabase(connection);
        let restored;
        try {
          restored = normalizeStoredChat(stored);
        } catch {
          restored = null;
        }
        if (!alive) {
          connection.close();
          return;
        }
        database.current = connection;
        if (restored) dispatch({ type: "restore", conversations: restored });
        setSavedSnapshot(restored || latest.current);
        setStatus("saved");
      } catch {
        if (alive) setStatus("unavailable");
      } finally {
        if (alive) setReady(true);
      }
    }
    void restore();
    return () => {
      alive = false;
      database.current = null;
      connection?.close();
    };
  }, [dispatch]);
  useEffect(() => {
    if (!ready || !database.current) return;
    let alive = true;
    const save = () => {
      const snapshot = latest.current;
      if (!database.current) return Promise.resolve();
      return writeChatDatabase(database.current, snapshot)
        .then(() => {
          if (alive) {
            setStatus("saved");
            setSavedSnapshot(snapshot);
          }
        })
        .catch(() => {
          if (alive) setStatus("unavailable");
        });
    };
    const timer = setTimeout(save, 300);
    window.addEventListener("pagehide", save);
    return () => {
      alive = false;
      clearTimeout(timer);
      window.removeEventListener("pagehide", save);
    };
  }, [conversations, ready]);
  return {
    ready,
    status:
      status === "saved" && savedSnapshot !== conversations ? "saving" : status,
  };
}
