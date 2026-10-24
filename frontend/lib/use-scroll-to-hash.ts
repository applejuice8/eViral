"use client";

import * as React from "react";

// content loads after the page, so scroll manually once ready
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
