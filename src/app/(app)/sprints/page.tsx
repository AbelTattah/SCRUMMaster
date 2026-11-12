import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { requireOnboardedUser } from "@/lib/auth";
import { listSprints } from "@/lib/data/sprints";

export const metadata: Metadata = { title: "Sprints" };

export default async function SprintsPage() {
  const user = await requireOnboardedUser();

  const sprints = await listSprints(user.id);

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-heading">
          <h1 className="greeting">Sprints</h1>
          <p className="date-line">Plan, track, and review your sprints.</p>
        </div>
      </header>

      {sprints.length === 0 ? (
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
                  {sprint.start_date} → {sprint.end_date}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
