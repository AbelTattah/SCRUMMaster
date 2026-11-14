"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { localdb } from "@/lib/localdb";
import { pullSprints } from "@/lib/sync";
import type { Sprint } from "@/lib/types";

export default function SprintsPageClient() {
  const [sprints, setSprints] = useState<Sprint[] | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      void pullSprints();
      const rows = await localdb.sprints.orderBy("created_at").reverse().toArray();
      if (alive) {
        setSprints(rows as Sprint[]);
      }
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
  }, []);

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-heading">
          <h1 className="greeting">Sprints</h1>
          <p className="date-line">Plan, track, and review your sprints.</p>
        </div>
      </header>

      {sprints === null ? (
        <p className="hint-text">Loading sprints�?�</p>
      ) : sprints.length === 0 ? (
        <p className="empty">No sprints yet. Create one from the home page.</p>
      ) : (
        <ul className="sprint-list">
          {sprints.map((sprint) => (
            <li key={sprint.id} className="sprint-card">
              <Link href={`/sprints/${sprint.id}`} className="sprint-card-link">
                <div className="sprint-card-header">
                  <strong>{sprint.name}</strong>
                  <span className={`chip chip--${sprint.status}`}>{sprint.status}</span>
                </div>
                {sprint.goal ? <p className="sprint-goal">{sprint.goal}</p> : null}
                <p className="sprint-dates">
                  {sprint.start_date} �+' {sprint.end_date}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
