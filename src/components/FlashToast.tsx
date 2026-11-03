"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Shows the one-shot ?notice= / ?error= message produced by a server action,
 * then removes it from the URL so a refresh does not repeat it.
 */
export function FlashToast() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const notice = searchParams.get("notice");
  const error = searchParams.get("error");
  const message = error || notice;

  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("notice");
      params.delete("error");

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [message, pathname, router, searchParams]);

  if (!message) {
    return null;
  }

  return (
    <div className={error ? "toast toast--error" : "toast"} role={error ? "alert" : "status"}>
      {message}
    </div>
  );
}
