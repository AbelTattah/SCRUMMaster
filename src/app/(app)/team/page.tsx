import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { addMember, removeMember } from "@/app/actions/team";
import { ConfirmForm } from "@/components/ConfirmForm";
import { TaskRow } from "@/components/TaskRow";
import { requireOnboardedUser } from "@/lib/auth";
import { listMembers } from "@/lib/data/profiles";
import { listTeamTodos } from "@/lib/data/todos";
import { levelFor } from "@/lib/gamification";
import type { Member, PageFilter } from "@/lib/types";
import { avatarUrl, firstParam } from "@/lib/utils";

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

function byScore(a: Member, b: Member): number {
  return b.xp - a.xp || a.name.localeCompare(b.name);
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

  const [{ todos }, members] = await Promise.all([
    listTeamTodos(organization.id, page, q),
    listMembers(organization.id, organization.owner_id),
  ]);

  const leaderboard = [...members].sort(byScore);
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

        <form action={addMember} className="inline-form member-add">
          <label className="field">
            <span>Email address</span>
            <input
              className="input"
              type="email"
              name="email"
              placeholder="teammate@example.com"
              autoComplete="email"
              required
            />
          </label>
          <button className="btn-primary btn-small" type="submit">
            Add member
          </button>
        </form>

        <div className="member-chips">
          {members.map((member) => (
            <span className="chip" key={member.id}>
              <img src={avatarUrl(member.avatar_url)} alt="" />
              {member.name}
              <span className="chip-count">{member.todo_count}</span>

              {member.invited_at ? (
                <span className="chip-pending" title="They have not signed in yet">
                  Invite pending
                </span>
              ) : null}

              {member.is_owner ? null : (
                <ConfirmForm
                  action={removeMember}
                  className="member-remove"
                  confirmTitle="Remove member?"
                  confirmMessage={`${member.name} will lose access to this organization's tasks. Their own tasks and reports stay with them.`}
                  confirmLabel="Remove"
                >
                  <input type="hidden" name="member_id" value={member.id} />
                  <button
                    type="submit"
                    className="chip-x"
                    aria-label={`Remove ${member.name}`}
                    title={`Remove ${member.name}`}
                  >
                    ×
                  </button>
                </ConfirmForm>
              )}
            </span>
          ))}
        </div>
      </section>

      <section className="card team-board">
        <h2 className="card-title">Leaderboard</h2>
        <p className="card-sub">
          XP from completed tasks (+10). A level every 250 XP.
        </p>

        <ol className="leaderboard">
          {leaderboard.map((member, index) => (
            <li className="leader-row" key={member.id}>
              <span className={`leader-rank${index < 3 ? ` is-top-${index + 1}` : ""}`}>
                {index + 1}
              </span>

              <img className="leader-avatar" src={avatarUrl(member.avatar_url)} alt="" />

              <span className="leader-name">
                {member.name}
                {member.is_owner ? <span className="chip chip--owner">Owner</span> : null}
              </span>

              <span className="leader-level">Lv {levelFor(member.xp)}</span>
              <span className="leader-xp">{member.xp} XP</span>

              {member.invited_at ? (
                <span className="chip-pending" title="They have not signed in yet">
                  Invite pending
                </span>
              ) : null}
            </li>
          ))}
        </ol>
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
        {todos.length === 0 ? (
          <p className="empty">
            {q ? (
              <>No team todos match &ldquo;{q}&rdquo;.</>
            ) : (
              <>Nothing here yet — assign a task from Add Todo, or wait for your members to add their own.</>
            )}
          </p>
        ) : (
          todos.map((todo) => (
            <TaskRow
              key={todo.id}
              todo={todo}
              returnTo={returnTo}
              variant="team"
              currentUserId={user.id}
              members={members}
              canAssign
            />
          ))
        )}
      </section>
    </>
  );
}
