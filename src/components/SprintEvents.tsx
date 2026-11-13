"use client";

import { useEffect, useState, useTransition } from "react";

import {
  loadDailyScrumEntries,
  loadSprintReviews,
  saveDailyScrumAction,
  saveSprintReviewAction,
} from "@/app/actions/scrumEvents";
import type { DailyScrumEntry, SprintReview } from "@/lib/types";

interface Props {
  sprintId: string;
}

export function SprintEvents({ sprintId }: Props) {
  const [tab, setTab] = useState<"review" | "daily">("review");

  const [reviews, setReviews] = useState<SprintReview[]>([]);
  const [daily, setDaily] = useState<DailyScrumEntry[]>([]);

  const [wentWell, setWentWell] = useState("");
  const [toImprove, setToImprove] = useState("");
  const [actionItems, setActionItems] = useState("");

  const [yesterday, setYesterday] = useState("");
  const [today, setToday] = useState("");
  const [blockers, setBlockers] = useState("");

  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  async function load() {
    try {
      const [r, d] = await Promise.all([
        loadSprintReviews(sprintId),
        loadDailyScrumEntries(sprintId),
      ]);
      setReviews(r);
      setDaily(d);
    } catch {
      // Offline or unavailable: keep local/empty state without crashing.
    }
  }

  useEffect(() => {
    void load();
  }, [sprintId]);

  function saveReview() {
    startTransition(async () => {
      try {
        await saveSprintReviewAction(sprintId, wentWell, toImprove, actionItems);
        await load();
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } catch {
        // Offline or unavailable.
      }
    });
  }

  function saveScrum() {
    startTransition(async () => {
      try {
        await saveDailyScrumAction(sprintId, yesterday, today, blockers);
        setYesterday("");
        setToday("");
        setBlockers("");
        await load();
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } catch {
        // Offline or unavailable.
      }
    });
  }

  return (
    <section className="panel">
      <nav className="filter-pills" aria-label="Scrum events">
        <button
          type="button"
          className={`pill${tab === "review" ? " is-active" : ""}`}
          onClick={() => setTab("review")}
        >
          Review &amp; Retrospective
        </button>
        <button
          type="button"
          className={`pill${tab === "daily" ? " is-active" : ""}`}
          onClick={() => setTab("daily")}
        >
          Daily Scrum
        </button>
      </nav>

      {tab === "review" ? (
        <>
          <div className="retro-grid">
            <label className="field">
              <span>What went well</span>
              <textarea
                className="input"
                rows={4}
                placeholder="Wins worth repeating."
                value={wentWell}
                onChange={(event) => setWentWell(event.target.value)}
              />
            </label>
            <label className="field">
              <span>What to improve</span>
              <textarea
                className="input"
                rows={4}
                placeholder="Friction to remove."
                value={toImprove}
                onChange={(event) => setToImprove(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Action items</span>
              <textarea
                className="input"
                rows={4}
                placeholder="What we will change next sprint."
                value={actionItems}
                onChange={(event) => setActionItems(event.target.value)}
              />
            </label>
          </div>

          <button type="button" className="btn-add" onClick={saveReview} disabled={pending}>
            {pending ? "Saving..." : "Save retrospective"}
          </button>

          {reviews.length > 0 ? (
            <ul className="event-list">
              {reviews.map((review) => (
                <li key={review.id} className="event-item">
                  {review.went_well ? (
                    <p>
                      <strong>Went well:</strong> {review.went_well}
                    </p>
                  ) : null}
                  {review.to_improve ? (
                    <p>
                      <strong>To improve:</strong> {review.to_improve}
                    </p>
                  ) : null}
                  {review.action_items ? (
                    <p>
                      <strong>Actions:</strong> {review.action_items}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}

      {tab === "daily" ? (
        <>
          <div className="retro-grid">
            <label className="field">
              <span>Yesterday</span>
              <textarea
                className="input"
                rows={3}
                placeholder="What did you finish?"
                value={yesterday}
                onChange={(event) => setYesterday(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Today</span>
              <textarea
                className="input"
                rows={3}
                placeholder="What will you work on?"
                value={today}
                onChange={(event) => setToday(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Blockers</span>
              <textarea
                className="input"
                rows={3}
                placeholder="Anything in the way?"
                value={blockers}
                onChange={(event) => setBlockers(event.target.value)}
              />
            </label>
          </div>

          <button type="button" className="btn-add" onClick={saveScrum} disabled={pending}>
            {pending ? "Saving..." : "Post update"}
          </button>

          {daily.length > 0 ? (
            <ul className="event-list">
              {daily.map((entry) => (
                <li key={entry.id} className="event-item">
                  {entry.yesterday ? (
                    <p>
                      <strong>Yesterday:</strong> {entry.yesterday}
                    </p>
                  ) : null}
                  {entry.today ? (
                    <p>
                      <strong>Today:</strong> {entry.today}
                    </p>
                  ) : null}
                  {entry.blockers ? (
                    <p className="blocker-line">
                      <strong>Blockers:</strong> {entry.blockers}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}

      {saved ? <p className="flash-ok">Saved.</p> : null}
    </section>
  );
}
