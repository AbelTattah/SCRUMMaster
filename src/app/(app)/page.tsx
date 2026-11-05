import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AddTodoButton, AddTodoFab } from "@/components/AddTask";
import { TaskBoard } from "@/components/TaskBoard";
import { getCurrentUser, requireOnboardedUser } from "@/lib/auth";
import { listMembers } from "@/lib/data/profiles";
import { greetingFor, todayLine } from "@/lib/time";
import type { PageFilter } from "@/lib/types";
import { firstParam } from "@/lib/utils";

export const metadata: Metadata = { title: "Home" };

/**
 * The list itself renders client-side from the encrypted local mirror
 * (see TaskBoard): the server can no longer read task titles, so rows are
 * decrypted in the browser after the gate unlocks.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const current = await getCurrentUser();

  // "/" is the app's front door: signed-out visitors go straight to the sign-in
  // screen (silently — every other route below asks them to sign in with a
  // notice of its own).
  if (!current) {
    redirect("/login");
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

        <AddTodoButton returnTo={returnTo} />
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
