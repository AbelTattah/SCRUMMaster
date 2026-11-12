"use client";

import { useState } from "react";

import type { EbmSnapshot, SprintMetrics, VelocityPoint } from "@/lib/scrumMetrics";

interface Props {
  metrics: SprintMetrics;
  ebm: EbmSnapshot;
  velocity: { points: VelocityPoint[]; average: number };
}

export function SprintMetricsPanel({ metrics, ebm, velocity }: Props) {
  const [tab, setTab] = useState<"sprint" | "velocity" | "ebm">("sprint");

  return (
    <section className="panel">
      <nav className="filter-pills" aria-label="Metric views">
        <button
          type="button"
          className={`pill${tab === "sprint" ? " is-active" : ""}`}
          onClick={() => setTab("sprint")}
        >
          Sprint
        </button>
        <button
          type="button"
          className={`pill${tab === "velocity" ? " is-active" : ""}`}
          onClick={() => setTab("velocity")}
        >
          Velocity
        </button>
        <button
          type="button"
          className={`pill${tab === "ebm" ? " is-active" : ""}`}
          onClick={() => setTab("ebm")}
        >
          EBM
        </button>
      </nav>

      {tab === "sprint" ? (
        <div className="metric-grid">
          <div className="stat-card">
            <span className="stat-label">Story points</span>
            <strong className="stat-value">
              {metrics.completed}/{metrics.committed}
            </strong>
            <span className="stat-meta">{metrics.completionRate}% complete</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Tasks</span>
            <strong className="stat-value">
              {metrics.completedTasks}/{metrics.totalTasks}
            </strong>
            <span className="stat-meta">{metrics.openTasks} still open</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Blocked</span>
            <strong className="stat-value">{metrics.blockedTasks}</strong>
            <span className="stat-meta">
              {metrics.blockedTasks === 0 ? "nothing in the way" : "needs attention"}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Cycle time</span>
            <strong className="stat-value">
              {metrics.averageCycleTimeHours === null
                ? "-"
                : `${metrics.averageCycleTimeHours}h`}
            </strong>
            <span className="stat-meta">average per finished task</span>
          </div>

          {metrics.committed > 0 ? (
            <div className="burndown">
              <div className="burndown-bar">
                <div
                  className="burndown-done"
                  style={{ width: `${metrics.completionRate}%` }}
                />
              </div>
              <p className="burndown-caption">
                {metrics.remaining} point{metrics.remaining === 1 ? "" : "s"} remaining
              </p>
            </div>
          ) : (
            <p className="hint-text">
              Add story points to your tasks to see sprint progress here.
            </p>
          )}
        </div>
      ) : null}

      {tab === "velocity" ? (
        <div className="metric-grid">
          {velocity.points.length === 0 ? (
            <p className="hint-text">
              Complete a sprint with story points to start tracking velocity.
            </p>
          ) : (
            <>
              <div className="stat-card">
                <span className="stat-label">Average velocity</span>
                <strong className="stat-value">{velocity.average}</strong>
                <span className="stat-meta">points per sprint</span>
              </div>
              <ul className="velocity-list">
                {velocity.points.map((point) => (
                  <li key={point.sprintId} className="velocity-row">
                    <span className="velocity-name">{point.name}</span>
                    <span className="velocity-bar">
                      <span
                        className="velocity-fill"
                        style={{
                          width: `${
                            point.committed > 0
                              ? Math.round((point.completed / point.committed) * 100)
                              : 0
                          }%`,
                        }}
                      />
                    </span>
                    <span className="velocity-value">
                      {point.completed}/{point.committed}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : null}

      {tab === "ebm" ? (
        <div className="metric-grid">
          <div className="stat-card">
            <span className="stat-label">Current value</span>
            <strong className="stat-value">{ebm.currentValue}%</strong>
            <span className="stat-meta">scope delivered</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Unrealized value</span>
            <strong className="stat-value">{ebm.unrealizedValue}%</strong>
            <span className="stat-meta">still to realize</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Ability to innovate</span>
            <strong className="stat-value">{ebm.abilityToInnovate}%</strong>
            <span className="stat-meta">capacity not blocked</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Time to market</span>
            <strong className="stat-value">{ebm.timeToMarket}d</strong>
            <span className="stat-meta">since sprint start</span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
