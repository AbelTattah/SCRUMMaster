import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { addMember, removeMember } from "@/app/actions/team";
import { ActivateMemberButton } from "@/components/ActivateMemberButton";
import { ConfirmForm } from "@/components/ConfirmForm";
import { TaskBoard } from "@/components/TaskBoard";
import { requireOnboardedUser } from "@/lib/auth";
import { memberGrantStatus } from "@/lib/data/grants";
import { listMembers } from "@/lib/data/profiles";
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

  // Team todos arrive through the offline mirror (TaskBoard pulls them);
  // the members list still comes from the server for the chips + assignee
  // picker. Grant status drives the per-member Activate button (who still
  // needs the organization key to open tasks).
  const [members, grantStatus] = await Promise.all([
    listMembers(organization.id, organization.owner_id),
    memberGrantStatus(organization.id, user.id),
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
          {members.map((member) => {
            const grant = grantStatus[member.id];

            return (
              <span className="chip" key={member.id}>
                <img src={avatarUrl(member.avatar_url, member.name, member.id)} alt="" />
                {member.name}
                <span className="chip-count">{member.todo_count}</span>

                {member.invited_at ? (
                  <span className="chip-pending" title="They have not signed in yet">
                    Invite pending
                  </span>
                ) : null}

                {!member.is_owner && grant?.needsGrant && grant.pub ? (
                  <ActivateMemberButton
                    memberId={member.id}
                    memberName={member.name}
                    pub={grant.pub}
                  />
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
            );
          })}
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

              <img
                className="leader-avatar"
                src={avatarUrl(member.avatar_url, member.name, member.id)}
                alt=""
              />

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
