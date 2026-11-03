import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { TeamRow } from "@/components/TeamRow";
import { requireOnboardedUser } from "@/lib/auth";
import { listMembers } from "@/lib/data/profiles";
import { listTeamTodos } from "@/lib/data/todos";
import type { PageFilter } from "@/lib/types";
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

      <div className="member-chips">
        {members.map((member) => (
          <span className="chip" key={member.id}>
            <img src={avatarUrl(member.avatar_url)} alt="" />
            {member.name}
            <span className="chip-count">{member.todo_count}</span>
          </span>
        ))}
      </div>

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
              <>Nothing here yet — tasks appear as soon as your members add them.</>
            )}
          </p>
        ) : (
          todos.map((todo) => <TeamRow todo={todo} key={todo.id} />)
        )}
      </section>
    </>
  );
}
