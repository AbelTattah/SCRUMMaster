"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { signOut } from "@/app/actions/auth";
import { AccountSwitcher } from "@/components/AccountSwitcher";
import { ConfirmForm } from "@/components/ConfirmForm";
import { Icon } from "@/components/icons";
import { NotificationBell } from "@/components/NotificationBell";
import { clearOfflineSession } from "@/lib/offlineSession";
import { clearKeys } from "@/lib/keys";
import { wipeLocal } from "@/lib/localdb";
import { drainBeforeSignOut } from "@/lib/sync";
import type { Counts, CurrentUser, NotificationItem, PageFilter } from "@/lib/types";
import { avatarUrl } from "@/lib/utils";

type AppView = "home" | "team" | "account" | "settings" | "notifications" | "reports" | "today" | "backlog" | "sprints";

function hrefs(page: PageFilter, q: string) {
  const search = q ? `&q=${encodeURIComponent(q)}` : "";

  return {
    home: q ? `/?q=${encodeURIComponent(q)}` : "/",
    today: `/?page=today${search}`,
    backlog: `/?page=backlog${search}`,
    completed: `/?page=completed${search}`,
    inProgress: `/?page=in-progress${search}`,
    team: "/team",
    reports: "/reports",
    profile: "/account",
    settings: "/settings",
  };
}

function activeState(view: AppView, page: PageFilter) {
  return {
    home: view === "home" && page === "home",
    today: view === "home" && page === "today",
    backlog: view === "home" && page === "backlog",
    completed: view === "home" && page === "completed",
    inProgress: view === "home" && page === "in-progress",
    team: view === "team",
    reports: view === "reports",
    sprints: view === "sprints",
    profile: view === "account",
    settings: view === "settings",
  };
}

function useLocation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rawPage = searchParams.get("page");
  const page: PageFilter =
    rawPage === "completed" || rawPage === "in-progress" || rawPage === "today" || rawPage === "backlog"
      ? rawPage
      : "home";
  const q = searchParams.get("q") ?? "";

  const view: AppView =
    pathname === "/team"
      ? "team"
      : pathname === "/account"
        ? "account"
        : pathname === "/settings"
          ? "settings"
          : pathname === "/notifications"
            ? "notifications"
            : pathname === "/reports"
              ? "reports"
              : pathname === "/sprints"
                ? "sprints"
                : "home";

  return { view, page, q };
}

export function Sidebar({
  user,
  counts,
  isGuest,
}: {
  user: CurrentUser;
  counts: Counts;
  isGuest?: boolean;
}) {
  const { view, page, q } = useLocation();
  const links = hrefs(page, q);
  const active = activeState(view, page);
  const orgName = user.organization?.name || user.email;

  return (
    <aside className="sidebar">
      <div className="sidebar-workspace">
        <span className="workspace-avatar"><Icon name="sprint" /></span>
        <span className="workspace-meta">
          <strong>{user.organization?.name ?? "Scrum Master"}</strong>
          <small>Workspace</small>
        </span>
        <AccountSwitcher user={user} isGuest={isGuest} />
      </div>

      <div className="sidebar-scroll">
      <nav className="nav nav--tasks" aria-label="Tasks">
        <p className="nav-section-label">Tasks</p>
        <Link
          className={`nav-item${active.home ? " is-active" : ""}`}
          href={links.home}
          aria-current={active.home ? "page" : undefined}
        >
          <Icon name="home" />
          <span className="nav-label">All Tasks</span>
        </Link>

        <Link
          className={`nav-item${active.today ? " is-active" : ""}`}
          href={links.today}
          aria-current={active.today ? "page" : undefined}
        >
          <Icon name="today" />
          <span className="nav-label">Today</span>
        </Link>

        <Link
          className={`nav-item${active.backlog ? " is-active" : ""}`}
          href={links.backlog}
          aria-current={active.backlog ? "page" : undefined}
        >
          <Icon name="backlog" />
          <span className="nav-label">Backlogs</span>
        </Link>

        <Link
          className={`nav-item${active.completed ? " is-active" : ""}`}
          href={links.completed}
          aria-current={active.completed ? "page" : undefined}
        >
          <Icon name="completed" />
          <span className="nav-label">Completed</span>
          {counts.completed > 0 ? (
            <span className="badge badge--purple">{counts.completed}</span>
          ) : null}
        </Link>

        <Link
          className={`nav-item${active.inProgress ? " is-active" : ""}`}
          href={links.inProgress}
          aria-current={active.inProgress ? "page" : undefined}
        >
          <Icon name="in-progress" />
          <span className="nav-label">Now</span>
          {counts.in_progress > 0 ? (
            <span className="badge badge--amber">{counts.in_progress}</span>
          ) : null}
        </Link>

      </nav>

      <nav className="nav nav--workspace" aria-label="Workspace">
        <p className="nav-section-label">Workspace</p>
        <Link
          className={`nav-item${active.reports ? " is-active" : ""}`}
          href={links.reports}
          aria-current={active.reports ? "page" : undefined}
        >
          <Icon name="report" />
          <span className="nav-label">Reports</span>
        </Link>

        <Link
          className={`nav-item${active.sprints ? " is-active" : ""}`}
          href="/sprints"
          aria-current={active.sprints ? "page" : undefined}
        >
          <Icon name="sprint" />
          <span className="nav-label">Sprints</span>
        </Link>
        {user.isOwner ? (
          <Link
            className={`nav-item${active.team ? " is-active" : ""}`}
            href={links.team}
            aria-current={active.team ? "page" : undefined}
          >
            <Icon name="team" />
            <span className="nav-label">Team</span>
          </Link>
        ) : null}
      </nav>

      <nav className="nav nav--account" aria-label="Account">
        <p className="nav-section-label">Account</p>
        <Link
          className={`nav-item${active.profile ? " is-active" : ""}`}
          href={links.profile}
          aria-current={active.profile ? "page" : undefined}
        >
          <Icon name="user" />
          <span className="nav-label">Profile</span>
        </Link>
      </nav>
      </div>

      <div className="sidebar-footer">
        <Link className="sidebar-user" href={links.profile} title="Your account">
          <img src={avatarUrl(user.profile.avatar_url, user.profile.name, user.profile.id)} alt="" />
          <span className="sidebar-user-text">
            <span className="sidebar-user-name">{user.profile.name}</span>
            <span className="sidebar-user-meta">{orgName}</span>
          </span>
        </Link>

        <div className="sidebar-footer-actions">
          <Link
            className={`icon-btn${active.settings ? " is-active" : ""}`}
            href={links.settings}
            aria-label="Settings"
            title="Settings"
            aria-current={active.settings ? "page" : undefined}
          >
            <Icon name="settings" />
          </Link>

          {isGuest ? (
            <button
              className="icon-btn icon-btn--danger"
              type="button"
              aria-label="Exit guest mode"
              title="Exit guest mode"
              onClick={() => {
                try {
                  clearOfflineSession();
                  document.cookie = "scrum-guest=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                  localStorage.removeItem("scrum-guest");
                } catch {
                  // ignore
                }
                window.location.href = "/login";
              }}
            >
              <Icon name="logout" />
            </button>
          ) : (
            <ConfirmForm
              action={async () => {
                const { clearOfflineSession } = await import("@/lib/offlineSession");
                clearOfflineSession();
                await drainBeforeSignOut().catch(() => undefined);
                await wipeLocal().catch(() => undefined);
                clearKeys();
                await signOut();
              }}
              confirmMessage="You will need to sign in again to see your tasks."
              confirmTitle="Sign out of Scrum Master?"
              confirmLabel="Sign out"
            >
              <button
                className="icon-btn icon-btn--danger"
                type="submit"
                aria-label="Sign out"
                title="Sign out"
              >
                <Icon name="logout" />
              </button>
            </ConfirmForm>
          )}
        </div>
      </div>
    </aside>
  );
}

export function Tabbar({ user, counts, isGuest }: { user: CurrentUser; counts: Counts; isGuest?: boolean }) {
  const { view, page, q } = useLocation();
  const links = hrefs(page, q);
  const active = activeState(view, page);

  return (
    <nav className="tabbar" aria-label="Primary">
      <Link
        className={`tab${active.home ? " is-active" : ""}`}
        href={links.home}
        aria-current={active.home ? "page" : undefined}
      >
        <span className="tab-icon">
          <Icon name="home" />
        </span>
        <span className="tab-label">Home</span>
      </Link>

      <Link
        className={`tab${active.today ? " is-active" : ""}`}
        href={links.today}
        aria-current={active.today ? "page" : undefined}
      >
        <span className="tab-icon">
          <Icon name="today" />
        </span>
        <span className="tab-label">Today</span>
      </Link>

      <Link
        className={`tab${active.inProgress ? " is-active" : ""}`}
        href={links.inProgress}
        aria-current={active.inProgress ? "page" : undefined}
      >
        <span className="tab-icon">
          <Icon name="in-progress" />
          {counts.in_progress > 0 ? (
            <span className="badge badge--amber">{counts.in_progress}</span>
          ) : null}
        </span>
        <span className="tab-label">Now</span>
      </Link>

      {!isGuest ? (
        <Link
          className={`tab${active.reports ? " is-active" : ""}`}
          href={links.reports}
          aria-current={active.reports ? "page" : undefined}
        >
          <span className="tab-icon">
            <Icon name="report" />
          </span>
          <span className="tab-label">Reports</span>
        </Link>
      ) : (
        <Link
          className={`tab${active.sprints ? " is-active" : ""}`}
          href="/sprints"
          aria-current={active.sprints ? "page" : undefined}
        >
          <span className="tab-icon">
            <Icon name="sprint" />
          </span>
          <span className="tab-label">Sprints</span>
        </Link>
      )}

      <Link
        className={`tab${active.profile ? " is-active" : ""}`}
        href={isGuest ? "/" : links.profile}
        aria-current={active.profile ? "page" : undefined}
      >
        <span className="tab-icon">
          <Icon name="user" />
        </span>
        <span className="tab-label">{isGuest ? "Guest" : "Profile"}</span>
      </Link>
    </nav>
  );
}

export function Topbar({
  user,
  unread,
  notifications,
  isGuest,
}: {
  user: CurrentUser;
  unread: number;
  notifications: NotificationItem[];
  isGuest?: boolean;
}) {
  const { view, page, q } = useLocation();
  const team = view === "team";

  return (
    <header className="topbar">
      <Link className="mobile-brand" href="/">
        <img className="brand-img brand-img--light" src="/logo-wordmark.png" alt="Scrum Master" />
        <img className="brand-img brand-img--dark" src="/logo-wordmark-white.png" alt="Scrum Master" />
      </Link>

      <form className="search" method="get" action={team ? "/team" : "/"} role="search">
        {!team && page !== "home" ? (
          <input type="hidden" name="page" value={page} />
        ) : null}

        <Icon name="search" />

        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="search  for task ..."
          aria-label="Search for a task"
        />
      </form>

      <div className="topbar-right">
        <NetworkPill />

        {!isGuest ? <NotificationBell unread={unread} notifications={notifications} /> : null}

        {!isGuest ? (
          <Link
            className="icon-btn topbar-settings"
            href="/settings"
            aria-label="Settings"
            title="Settings"
          >
            <Icon name="settings" />
          </Link>
        ) : null}

        <Link className="avatar" href={isGuest ? "/" : "/account"} title={isGuest ? "Guest mode" : "Your profile"}>
          <img
            src={avatarUrl(user.profile.avatar_url, user.profile.name, user.profile.id)}
            alt="Profile picture"
          />
        </Link>
      </div>
    </header>
  );
}

function NetworkPill() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const update = async () => {
      const { checkOnline } = await import("@/lib/connectivity");
      const result = await checkOnline();
      if (!cancelled) setOnline(result);
    };
    update();
    const interval = setInterval(update, 5000);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  if (online) {
    return null;
  }

  return (
    <span
      className="net-pill"
      role="status"
      title="Working offline - your changes are saved on this device and sync when the connection is back."
    >
      <span className="net-pill-dot" aria-hidden="true" />
      Offline
    </span>
  );
}
