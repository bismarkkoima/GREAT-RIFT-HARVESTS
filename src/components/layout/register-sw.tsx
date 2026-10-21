"use client";

import { useEffect } from "react";

// Registers the service worker (offline page + asset caching) in production only,
// so it never serves stale files during development.
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
