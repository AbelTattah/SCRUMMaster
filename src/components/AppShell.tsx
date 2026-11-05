"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { ConfirmForm } from "@/components/ConfirmForm";
import { Icon } from "@/components/icons";
import type { Counts, CurrentUser, PageFilter } from "@/lib/types";
import { avatarUrl } from "@/lib/utils";

type AppView = "home" | "team" | "account" | "settings" | "notifications" | "reports";

function hrefs(page: PageFilter, q: string) {
  const search = q ? `&q=${encodeURIComponent(q)}` : "";

  return {
    home: q ? `/?q=${encodeURIComponent(q)}` : "/",
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
    completed: view === "home" && page === "completed",
    inProgress: view === "home" && page === "in-progress",
    team: view === "team",
    reports: view === "reports",
    profile: view === "account",
    settings: view === "settings",
  };
}

function useLocation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rawPage = searchParams.get("page");
  const page: PageFilter =
    rawPage === "completed" || rawPage === "in-progress" ? rawPage : "home";
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
              : "home";

  return { view, page, q };
}

export function Sidebar({ user, counts }: { user: CurrentUser; counts: Counts }) {
  const { view, page, q } = useLocation();
  const links = hrefs(page, q);
  const active = activeState(view, page);
  const orgName = user.organization?.name || user.email;

  return (
    <aside className="sidebar">
      <div className="logo">
        <img src="/logo-wordmark.png" alt="Scrum Master" />
      </div>

      <nav className="nav" aria-label="Primary">
        <Link
          className={`nav-item${active.home ? " is-active" : ""}`}
          href={links.home}
          aria-current={active.home ? "page" : undefined}
        >
          <Icon name="home" />
          <span className="nav-label">Home</span>
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
          <span className="nav-label">In Progress</span>
          {counts.in_progress > 0 ? (
            <span className="badge badge--amber">{counts.in_progress}</span>
          ) : null}
        </Link>

        <Link
          className={`nav-item${active.reports ? " is-active" : ""}`}
          href={links.reports}
          aria-current={active.reports ? "page" : undefined}
        >
          <Icon name="report" />
          <span className="nav-label">Reports</span>
        </Link>
      </nav>

      <nav className="nav nav--account" aria-label="Account">
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

        <Link
          className={`nav-item${active.profile ? " is-active" : ""}`}
          href={links.profile}
          aria-current={active.profile ? "page" : undefined}
        >
          <Icon name="user" />
          <span className="nav-label">Profile</span>
        </Link>
      </nav>

      <div className="sidebar-footer">
        <Link className="sidebar-user" href={links.profile} title="Your account">
          <img src={avatarUrl(user.profile.avatar_url)} alt="" />
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

          <ConfirmForm
            action={signOut}
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
        </div>
      </div>
    </aside>
  );
}

export function Tabbar({ user, counts }: { user: CurrentUser; counts: Counts }) {
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
        className={`tab${active.completed ? " is-active" : ""}`}
        href={links.completed}
        aria-current={active.completed ? "page" : undefined}
      >
        <span className="tab-icon">
          <Icon name="completed" />
          {counts.completed > 0 ? (
            <span className="badge badge--purple">{counts.completed}</span>
          ) : null}
        </span>
        <span className="tab-label">Completed</span>
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
        <span className="tab-label">In Progress</span>
      </Link>

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

      {user.isOwner ? (
        <Link
          className={`tab${active.team ? " is-active" : ""}`}
          href={links.team}
          aria-current={active.team ? "page" : undefined}
        >
          <span className="tab-icon">
            <Icon name="team" />
          </span>
          <span className="tab-label">Team</span>
        </Link>
      ) : null}

      <Link
        className={`tab${active.profile ? " is-active" : ""}`}
        href={links.profile}
        aria-current={active.profile ? "page" : undefined}
      >
        <span className="tab-icon">
          <Icon name="user" />
        </span>
        <span className="tab-label">Profile</span>
      </Link>
    </nav>
  );
}

export function Topbar({ user, unread }: { user: CurrentUser; unread: number }) {
  const { view, page, q } = useLocation();
  const team = view === "team";

  return (
    <header className="topbar">
      <Link className="mobile-brand" href="/">
        <img src="/logo-wordmark.png" alt="Scrum Master" />
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
        <Link
          className={`bell${unread > 0 ? " has-unread" : ""}`}
          href="/notifications"
          aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
          title="Notifications"
        >
          <Icon name="bell" />
          {unread > 0 ? (
            <span className="bell-badge" aria-hidden="true">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Link>

        <Link
          className="icon-btn topbar-settings"
          href="/settings"
          aria-label="Settings"
          title="Settings"
        >
          <Icon name="settings" />
        </Link>

        <Link className="avatar" href="/account" title="Your profile">
          <img src={avatarUrl(user.profile.avatar_url)} alt="Profile picture" />
        </Link>
      </div>
    </header>
  );
}
