"use client";

/**
 * Narrow workspace rail (new UI design). A compact, always-visible strip of
 * icons on the far left of the app. It maps to the same destinations as the
 * sidebar so navigation stays consistent — it never introduces a new route.
 * Hidden on tablet/phone where the sidebar collapses to icons / the tab bar.
 */
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { Icon, type IconName } from "@/components/icons";
import type { Counts } from "@/lib/types";

interface RailItem {
  icon: IconName;
  label: string;
  href: string;
  active: boolean;
  badge?: number;
}

export function IconRail({ counts, isGuest }: { counts: Counts; isGuest?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = searchParams.get("page");

  const onHome = pathname === "/";
  const items: RailItem[] = [
    { icon: "home", label: "Home", href: "/", active: onHome && !page },
    { icon: "today", label: "Today", href: "/?page=today", active: onHome && page === "today" },
    { icon: "backlog", label: "Backlogs", href: "/?page=backlog", active: onHome && page === "backlog" },
    {
      icon: "in-progress",
      label: "Now",
      href: "/?page=in-progress",
      active: onHome && page === "in-progress",
      badge: counts.in_progress,
    },
    {
      icon: "completed",
      label: "Completed",
      href: "/?page=completed",
      active: onHome && page === "completed",
      badge: counts.completed,
    },
    { icon: "sprint", label: "Sprints", href: "/sprints", active: pathname.startsWith("/sprints") },
    { icon: "report", label: "Reports", href: "/reports", active: pathname.startsWith("/reports") },
  ];

  if (!isGuest) {
    items.push({ icon: "team", label: "Team", href: "/team", active: pathname.startsWith("/team") });
  }

  return (
    <aside className="icon-rail" aria-label="Workspace navigation">
      <Link className="rail-logo" href="/" title="Scrum Master" aria-label="Scrum Master home">
        <img src="/favicon.png" alt="" />
      </Link>

      <nav className="rail-nav">
        {items.map((item) => (
          <Link
            key={item.label}
            className={`rail-item${item.active ? " is-active" : ""}`}
            href={item.href}
            aria-label={item.label}
            title={item.label}
            aria-current={item.active ? "page" : undefined}
          >
            <Icon name={item.icon} />
            {item.badge && item.badge > 0 ? <span className="rail-badge">{item.badge}</span> : null}
          </Link>
        ))}
      </nav>

      <div className="rail-bottom">
        <Link
          className={`rail-item${pathname.startsWith("/account") ? " is-active" : ""}`}
          href={isGuest ? "/" : "/account"}
          aria-label={isGuest ? "Guest" : "Profile"}
          title={isGuest ? "Guest" : "Profile"}
        >
          <Icon name="user" />
        </Link>
      </div>
    </aside>
  );
}
