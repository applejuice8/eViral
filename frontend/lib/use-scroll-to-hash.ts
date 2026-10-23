"use client";

import * as React from "react";

// Content here loads after the page, so the browser's own jump to
// "#post-12" happens too early. Scroll once the content is ready.
export function useScrollToHash(ready: boolean) {
  React.useEffect(() => {
    if (!ready || !window.location.hash) return;
    const el = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ev-highlight");
    const t = setTimeout(() => el.classList.remove("ev-highlight"), 2500);
    return () => clearTimeout(t);
  }, [ready]);
}
