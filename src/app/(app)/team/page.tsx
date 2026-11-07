import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { TaskBoard } from "@/components/TaskBoard";
import { TeamLeaderboard } from "@/components/TeamLeaderboard";
import { TeamMembers } from "@/components/TeamMembers";
import { requireOnboardedUser } from "@/lib/auth";
import { memberGrantStatus } from "@/lib/data/grants";
import { listMembers } from "@/lib/data/profiles";
import type { PageFilter } from "@/lib/types";
import { firstParam } from "@/lib/utils";

export const metadata: Metadata = { title: "Team" };

function filterHref(page: PageFilter, q: string): string {
  const params = new URLSearchParams();
  if (page !== "home") {
    params.set("page", page);
  }
  if (q) {
    params.set("q", q);
  }

  const query = params.toString();

  return query ? `/team?${query}` : "/team";
}

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireOnboardedUser();
  const organization = user.organization;

  if (!organization) {
    redirect(`/account?error=${encodeURIComponent("Create an organization to see team todos.")}`);
  }

  if (!user.isOwner) {
    redirect(`/?error=${encodeURIComponent("Only the organization account can see team todos.")}`);
  }

  const params = await searchParams;
  const rawPage = firstParam(params.page);
  const page: PageFilter =
    rawPage === "completed" || rawPage === "in-progress" ? rawPage : "home";
  const q = firstParam(params.q).trim();

  // Team todos arrive through the offline mirror (TaskBoard pulls them);
  // the members list still comes from the server for the chips + assignee
  // picker. Grant status drives the per-member Activate button (who still
  // needs the organization key to open tasks).
  const [members, grantStatus] = await Promise.all([
    listMembers(organization.id, organization.owner_id),
    memberGrantStatus(organization.id, user.id),
  ]);

  const returnTo = filterHref(page, q);

  return (
    <>
      <header className="page-header">
        <div className="page-heading">
          <h1 className="greeting">Team todos</h1>
          <p className="date-line">
            {organization.name} — everything your members are working on.
          </p>
        </div>
      </header>

      <section className="card team-members">
        <h2 className="card-title">Members</h2>
        <p className="card-sub">
          Attach people by email — no account needed on their side yet. Assign
          and update tasks for them right away; they pick everything up when
          they first sign in.
        </p>

        <TeamMembers members={members} grantStatus={grantStatus} />
      </section>

      <section className="card team-board">
        <h2 className="card-title">Leaderboard</h2>
        <p className="card-sub">
          XP from completed tasks (+10). A level every 250 XP.
        </p>

        <TeamLeaderboard members={members} />
      </section>

      <nav className="filter-pills" aria-label="Filter team todos">
        <Link
          className={`pill${page === "home" ? " is-active" : ""}`}
          href={filterHref("home", q)}
        >
          All
        </Link>
        <Link
          className={`pill${page === "in-progress" ? " is-active" : ""}`}
          href={filterHref("in-progress", q)}
        >
          In Progress
        </Link>
        <Link
          className={`pill${page === "completed" ? " is-active" : ""}`}
          href={filterHref("completed", q)}
        >
          Completed
        </Link>
      </nav>

      <section className="panel" aria-label="Team todos">
        <TaskBoard
          scope="team"
          page={page}
          q={q}
          focusId=""
          returnTo={returnTo}
          members={members}
          currentUserId={user.id}
          canAssign
          autoFocusAdd={false}
          emptyHint={
            <>
              Nothing here yet — assign a task from Add Todo, or wait for your
              members to add their own.
            </>
          }
        />
      </section>
    </>
  );
}
