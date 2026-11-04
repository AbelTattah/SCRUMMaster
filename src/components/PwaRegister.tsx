"use client";

import { useEffect } from "react";

/**
 * Registers the service worker (offline shell + notification display).
 *
 * Registered in development too — the worker keeps localhost chunk requests on
 * the network (see sw.js) so HMR is unaffected, and the Settings screen needs
 * a live worker to test push subscriptions locally.
 */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    function register() {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // A blocked worker (private mode, disabled SW) must not break the app.
      });
    }

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register);

    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
