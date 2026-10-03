import { useSyncExternalStore } from "react";
function subscribe(callback) {
  window.addEventListener("storage", callback);
  window.addEventListener("messages-language", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("messages-language", callback);
  };
}
function snapshot() {
  try {
    return localStorage.getItem("messages-locale") === "en" ? "en" : "ar";
  } catch {
    return "ar";
  }
}
export function useLanguage() {
  const locale = useSyncExternalStore(subscribe, snapshot, () => "ar");
  function setLocale(next) {
    const value = typeof next === "function" ? next(locale) : next;
    try {
      localStorage.setItem("messages-locale", value);
    } catch {}
    window.dispatchEvent(new Event("messages-language"));
  }
  return [locale, setLocale];
}
