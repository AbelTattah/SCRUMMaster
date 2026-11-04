import type { Metadata } from "next";
import Link from "next/link";

import { markAllRead, markRead } from "@/app/actions/notifications";
import { Icon } from "@/components/icons";
import { requireOnboardedUser } from "@/lib/auth";
import { notificationsForUser } from "@/lib/data/notifications";
import {
  notificationKindHint,
  notificationKindLabel,
} from "@/lib/notifications";
import { formatTimeRange } from "@/lib/time";
import type { NotificationItem, NotificationKind } from "@/lib/types";

export const metadata: Metadata = { title: "Notifications" };

const KINDS: NotificationKind[] = ["overdue", "blocker", "reminder", "report", "upcoming"];

export default async function NotificationsPage() {
  const user = await requireOnboardedUser();
  const items = await notificationsForUser(user.profile);
  const unread = items.filter((item) => !item.read).length;

  const groups: Record<NotificationKind, NotificationItem[]> = {
    overdue: [],
    blocker: [],
    reminder: [],
    report: [],
    upcoming: [],
  };

  for (const item of items) {
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
            Overdue tasks, blockers, reminders, your daily report and anything
            coming up later today will appear here.
          </p>

          <Link className="btn-primary btn-small" href="/">
            Back to tasks
          </Link>
        </div>
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
                            href={
                              item.kind === "report"
                                ? "/reports"
                                : `/?edit=${item.todo_id}`
                            }
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
