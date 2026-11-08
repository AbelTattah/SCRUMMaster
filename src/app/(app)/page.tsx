import { headers } from "next/headers";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AddTodoButton, AddTodoFab } from "@/components/AddTask";
import { StickyNotesButton } from "@/components/StickyNotes";
import { TaskBoard } from "@/components/TaskBoard";
import LandingPage from "@/components/LandingPage";
import { getCurrentUser, requireOnboardedUser } from "@/lib/auth";
import { listMembers } from "@/lib/data/profiles";
import { greetingFor, todayLine } from "@/lib/time";
import type { PageFilter } from "@/lib/types";
import { firstParam } from "@/lib/utils";

function isDesktop(userAgent: string | null): boolean {
  return /Electron/i.test(userAgent ?? "");
}

export async function generateMetadata(): Promise<Metadata> {
  const current = await getCurrentUser();
  if (!current) {
    const ua = (await headers()).get("user-agent");
    if (isDesktop(ua)) {
      return { title: "Sign in" };
    }
    return {
      title: "Scrum Master - tasks, teams and stand-up reports",
      description:
        "A fast, offline-first task manager for you and your team. Track today's work, assign to anyone, get reminded, and ship a stand-up report (PDF or Word) in one click. End-to-end encrypted.",
    };
  }
  return { title: "Home" };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const current = await getCurrentUser();
  const ua = (await headers()).get("user-agent");

  // Signed-out visitors see the marketing landing page at the root on web.
  // The desktop app has no landing page - signed-out users go straight to
  // sign-in, as before.
  if (!current) {
    if (isDesktop(ua)) {
      redirect("/login");
    }
    return <LandingPage />;
  }

  const user = await requireOnboardedUser();
  const params = await searchParams;

  const rawPage = firstParam(params.page);
  const page: PageFilter =
    rawPage === "completed" || rawPage === "in-progress" ? rawPage : "home";
  const q = firstParam(params.q).trim();

  // "?edit=" centres that row and starts renaming it; "?add=" opens the
  // inline composer (used by the header button and the phone FAB).
  const focusId = firstParam(params.edit);
  const openAdd = params.add !== undefined;

  const members = user.organization
    ? await listMembers(user.organization.id, user.organization.owner_id)
    : [];

  const search = new URLSearchParams();
  if (page !== "home") {
    search.set("page", page);
  }
  if (q) {
    search.set("q", q);
  }
  const returnTo = search.toString() ? `/?${search.toString()}` : "/";

  return (
    <>
      <header className="page-header">
        <div className="page-heading">
          <h1 className="greeting">{greetingFor(user.profile.name)}</h1>
          <p className="date-line">{todayLine()}</p>
        </div>

        <div className="page-header-actions">
          <StickyNotesButton />
          <AddTodoButton returnTo={returnTo} />
        </div>
      </header>

      <AddTodoFab returnTo={returnTo} />

      <section className="panel" aria-label="Todos">
        <TaskBoard
          scope="home"
          page={page}
          q={q}
          focusId={focusId}
          returnTo={returnTo}
          members={members}
          currentUserId={user.id}
          canAssign={user.isOwner}
          autoFocusAdd={openAdd}
        />
      </section>
    </>
  );
}
