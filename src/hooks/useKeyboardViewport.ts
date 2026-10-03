import { useEffect, useRef } from "react";

// Keep the app inside the visible area, including keyboard-driven panning on iOS.
export function useKeyboardViewport() {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const viewport = window.visualViewport;
    let frame = 0;
    function update() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!ref.current) return;
        const mobile = window.matchMedia("(max-width: 700px)").matches;
        // Preserve normal browser pinch zoom; track the keyboard only at native scale.
        const nativeScale = !viewport || Math.abs(viewport.scale - 1) < 0.05;
        ref.current.style.setProperty(
          "--visible-height",
          `${mobile && nativeScale && viewport ? viewport.height : window.innerHeight}px`,
        );
        ref.current.style.setProperty(
          "--visible-top",
          `${mobile && nativeScale && viewport ? viewport.offsetTop : 0}px`,
        );
      });
    }
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return ref;
}
