"use client";

import { useEffect } from "react";

import { playAlertSound } from "@/lib/sound";

/**
 * Registers the service worker (offline shell + notification display) and
 * relays the worker's "play the alert sound" message — the worker has no
 * audio of its own, but it raises notifications when no tab is focused.
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

    function onMessage(event: MessageEvent) {
      if ((event.data as { type?: string } | null)?.type === "alert-sound") {
        playAlertSound();
      }
    }

    function register() {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // A blocked worker (private mode, disabled SW) must not break the app.
      });
    }

    navigator.serviceWorker.addEventListener("message", onMessage);

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register);
    }

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
      window.removeEventListener("load", register);
    };
  }, []);

  return null;
}
