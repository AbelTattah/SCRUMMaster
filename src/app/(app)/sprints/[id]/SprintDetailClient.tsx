"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { SprintEvents } from "@/components/SprintEvents";
import { SprintMetricsPanel } from "@/components/SprintMetricsPanel";
import { localdb } from "@/lib/localdb";
import { decryptRows, pullOwn, pullSprints } from "@/lib/sync";
import { ebmSnapshot, sprintMetrics, velocityHistory } from "@/lib/scrumMetrics";
import type { Sprint, TeamTodo } from "@/lib/types";

export default function SprintDetailClient({ id }: { id: string }) {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [todos, setTodos] = useState<TeamTodo[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;

    async function load() {
      void Promise.all([pullSprints(), pullOwn()]);
      const [sprintRows, todoRows] = await Promise.all([
        localdb.sprints.toArray(),
        localdb.todos.toArray(),
      ]);
      const decrypted = await decryptRows(todoRows as any);
      if (!alive) return;
      setSprints(sprintRows as Sprint[]);
      setTodos(decrypted);
      setLoaded(true);
    }

    void load();
    const interval = setInterval(load, 5000);
    const onSync = () => void load();
    window.addEventListener("Scrum Master:sync", onSync);

    return () => {
      alive = false;
      clearInterval(interval);
      window.removeEventListener("Scrum Master:sync", onSync);
    };
  }, [id]);

  const sprint = useMemo(() => sprints.find((item) => item.id === id) ?? null, [sprints, id]);

  const metrics = useMemo(
    () => (sprint ? sprintMetrics(sprint as any, todos as any) : null),
    [sprint, todos],
  );
  const ebm = useMemo(
    () => (sprint && metrics ? ebmSnapshot(sprint as any, metrics as any) : null),
    [sprint, metrics],
  );
  const velocity = useMemo(
    () => velocityHistory(sprints as any, todos as any),
    [sprints, todos],
  );

  if (!loaded) {
    return <p className="hint-text">Loading sprint…</p>;
  }

  if (!sprint) {
    return (
      <div className="page">
        <p className="empty">Sprint not found.</p>
        <Link href="/sprints" className="back-link">
          &larr; Back to sprints
        </Link>
      </div>
    );
  }

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

      {metrics && ebm ? (
        <SprintMetricsPanel metrics={metrics} ebm={ebm} velocity={velocity} />
      ) : null}

      <SprintEvents sprintId={sprint.id} />
    </>
  );
}