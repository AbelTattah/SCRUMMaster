"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { markAllInline, markReadInline } from "@/app/actions/notifications";
import { Icon } from "@/components/icons";
import { notificationUrl } from "@/lib/notifications";
import type { NotificationItem } from "@/lib/types";

const MAX_ITEMS = 7;

/**
 * The top-bar bell. Opens a conventional popup with the latest alerts — it
 * never navigates on its own; clicking an item marks it read and jumps to
 * where it belongs (task, blocker list or …).
 */
export function NotificationBell({
  unread,
  notifications,
}: {
  unread: number;
  notifications: NotificationItem[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Close on outside click, Escape, and after navigating.
  useEffect(() => {
    if (!open) {
      return;
    }

    function onMouseDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function openItem(item: NotificationItem) {
    if (!item.read) {
      const data = new FormData();
      data.set("key", item.key);

      // Fire and forget: the revalidation refreshes the badge in place.
      startTransition(() => {
        void markReadInline(data);
      });
    }

    setOpen(false);
    router.push(notificationUrl(item));
  }

  function markAll() {
    startTransition(() => {
      void markAllInline();
    });
  }

  const shown = notifications.slice(0, MAX_ITEMS);

  return (
    <div className="bell-wrap" ref={rootRef}>
      <button
        type="button"
        className={`bell${unread > 0 ? " has-unread" : ""}`}
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
        aria-expanded={open}
        title="Notifications"
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="bell" />
        {unread > 0 ? (
          <span className="bell-badge" aria-hidden="true">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="notification-pop" role="dialog" aria-label="Notifications">
          <header className="pop-head">
            <strong>Notifications</strong>
            <Link href="/notifications">View all</Link>
          </header>

          {shown.length === 0 ? (
            <p className="pop-empty">Nothing needs your attention right now.</p>
          ) : (
            <ul className="pop-list">
              {shown.map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    className="pop-item"
                    onClick={() => openItem(item)}
                  >
                    <span
                      className={`notification-dot notification-dot--${item.kind}`}
                      aria-hidden="true"
                    />
                    <span className="pop-text">
                      <strong>{item.title}</strong>
                      <span>{item.detail}</span>
                    </span>
                    {item.read ? null : <span className="pop-unread" aria-hidden="true" />}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <footer className="pop-foot">
            {unread > 0 ? (
              <button type="button" className="pop-mark" onClick={markAll} disabled={pending}>
                {pending ? "Marking…" : "Mark all as read"}
              </button>
            ) : (
              <span />
            )}
            <Link href="/notifications">Open screen</Link>
          </footer>
        </div>
      ) : null}
    </div>
  );
}
