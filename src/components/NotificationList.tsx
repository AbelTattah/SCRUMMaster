"use client";

/**
 * The notifications screen. Titles and blocker notes are ciphertext on the
 * server — this component decrypts them at the display boundary (the same
 * place the bell and the OS alerts do) and renders the groups.
 */
import Link from "next/link";
import { useEffect, useState } from "react";

import { markAllRead, markRead } from "@/app/actions/notifications";
import { Icon } from "@/components/icons";
import { decorateAll, type NotificationDisplay } from "@/lib/notifyDisplay";
import {
  notificationKindHint,
  notificationKindLabel,
} from "@/lib/notifications";
import { formatTimeRange } from "@/lib/time";
import type { NotificationItem, NotificationKind } from "@/lib/types";

const KINDS: NotificationKind[] = ["overdue", "blocker", "reminder", "upcoming"];

export function NotificationList({ items }: { items: NotificationItem[] }) {
  const [shown, setShown] = useState<NotificationDisplay[] | null>(null);
  const unread = items.filter((item) => !item.read).length;

  useEffect(() => {
    let alive = true;

    void decorateAll(items).then((decorated) => {
      if (alive) {
        setShown(decorated);
      }
    });

    return () => {
      alive = false;
    };
  }, [items]);

  const groups: Record<NotificationKind, NotificationDisplay[]> = {
    overdue: [],
    blocker: [],
    reminder: [],
    upcoming: [],
    // The planning nudge lives only in the alert feed — empty by design.
    nudge: [],
  };

  for (const item of shown ?? []) {
    groups[item.kind].push(item);
  }

  return (
    <>
      <header className="page-header">
        <div className="page-heading">
          <h1 className="greeting">Notifications</h1>
          <p className="date-line">
            {items.length === 0 ? (
              "Nothing needs your attention right now."
            ) : (
              <>
                {unread} unread of {items.length} updated today.
              </>
            )}
          </p>
        </div>

        {unread > 0 ? (
          <form action={markAllRead} className="mark-all-form">
            <button className="btn-ghost btn-small" type="submit">
              Mark all as read
            </button>
          </form>
        ) : null}
      </header>

      {items.length === 0 ? (
        <div className="card empty-card">
          <Icon name="empty-bell" />

          <h2>You&rsquo;re all caught up</h2>
          <p>
            Overdue tasks, blockers, reminders and anything coming up later
            today will appear here.
          </p>

          <Link className="btn-primary btn-small" href="/">
            Back to tasks
          </Link>
        </div>
      ) : shown === null ? (
        <p className="empty">Loading notifications…</p>
      ) : (
        <div className="notification-groups">
          {KINDS.map((kind) => {
            const group = groups[kind];

            if (group.length === 0) {
              return null;
            }

            return (
              <section className="notification-group" key={kind}>
                <header className="notification-group-head">
                  <div>
                    <h2 className="notification-group-title">{notificationKindLabel(kind)}</h2>
                    <p className="notification-group-hint">{notificationKindHint(kind)}</p>
                  </div>

                  <span className="notification-count">{group.length}</span>
                </header>

                <div className="notification-list">
                  {group.map((item) => {
                    const range = formatTimeRange(item.start_time, item.end_time);

                    return (
                      <article
                        className={`notification-item${item.read ? "" : " is-unread"}`}
                        key={item.key}
                      >
                        <span
                          className={`notification-dot notification-dot--${kind}`}
                          aria-hidden="true"
                        />

                        <div className="notification-body">
                          <p className="notification-title">{item.title}</p>
                          <p className="notification-detail">
                            {item.detail}
                            {range ? <> · {range}</> : null}
                          </p>
                        </div>

                        <div className="notification-actions">
                          <Link
                            className="notification-open"
                            href={`/?edit=${item.todo_id}`}
                          >
                            Open
                          </Link>

                          {item.read ? (
                            <span className="notification-read-state">Read</span>
                          ) : (
                            <form action={markRead}>
                              <input type="hidden" name="key" value={item.key} />
                              <button className="notification-read" type="submit">
                                Mark read
                              </button>
                            </form>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
