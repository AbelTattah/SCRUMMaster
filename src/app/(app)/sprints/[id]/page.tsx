import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SprintEvents } from "@/components/SprintEvents";
import { SprintMetricsPanel } from "@/components/SprintMetricsPanel";
import { requireOnboardedUser } from "@/lib/auth";
import { listSprints } from "@/lib/data/sprints";
import { listTodosWithNames } from "@/lib/data/todos";
import { ebmSnapshot, sprintMetrics, velocityHistory } from "@/lib/scrumMetrics";

export const metadata: Metadata = { title: "Sprint" };

export default async function SprintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireOnboardedUser();
  const { id } = await params;

  const [sprints, todos] = await Promise.all([
    listSprints(user.id),
    listTodosWithNames(user.id),
  ]);

  const sprint = sprints.find((item) => item.id === id);

  if (!sprint) {
    notFound();
  }

  const metrics = sprintMetrics(sprint, todos);
  const ebm = ebmSnapshot(sprint, metrics);
  const velocity = velocityHistory(sprints, todos);

  return (
    <>
      <header className="page-header">
        <div className="page-heading">
          <Link href="/sprints" className="back-link">
            &larr; Sprints
          </Link>
          <h1 className="greeting">{sprint.name}</h1>
          <p className="date-line">
            {sprint.start_date} &rarr; {sprint.end_date}
          </p>
        </div>

        <span className={`chip chip--${sprint.status}`}>{sprint.status}</span>
      </header>

      {sprint.goal ? (
        <section className="panel">
          <h2 className="card-title">Sprint Goal</h2>
          <p className="sprint-goal-text">{sprint.goal}</p>
        </section>
      ) : null}

      <SprintMetricsPanel metrics={metrics} ebm={ebm} velocity={velocity} />

      <SprintEvents sprintId={sprint.id} />
    </>
  );
}
