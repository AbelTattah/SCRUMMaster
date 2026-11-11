"use client";

import { useEffect } from "react";

import type { CurrentUser } from "@/lib/types";
import {
  setOfflineHint,
  writeOfflineSession,
} from "@/lib/offlineSession";
import { checkOnline } from "@/lib/connectivity";

/** Tracks connectivity on every page (root layout). */
export function OfflineHintSync() {
  useEffect(() => {
    const update = async () => {
      const online = await checkOnline();
      setOfflineHint(!online);
    };
    update();
    const interval = setInterval(update, 15000);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return null;
}

/**
 * Persists the signed-in profile for the desktop shell so the bundled server
 * can render offline without calling Supabase.
 */
export function OfflineSessionSync({ user }: { user: CurrentUser }) {
  useEffect(() => {
    writeOfflineSession(user);
  }, [user]);

  return null;
}
