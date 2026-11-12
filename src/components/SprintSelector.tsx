"use client";

import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createSprintLocal, pullSprints, updateSprintStatusLocal } from "@/lib/sync";
import { localdb } from "@/lib/localdb";
import type { Sprint } from "@/lib/types";

interface SprintSelectorProps {
  selectedSprintId: string | null;
  onSelect: (sprintId: string | null) => void;
}

export function SprintSelector({ selectedSprintId, onSelect }: SprintSelectorProps) {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    void pullSprints();
    void localdb.sprints.toArray().then((rows) => setSprints(rows as Sprint[]));
    const interval = setInterval(() => {
      void localdb.sprints.toArray().then((rows) => setSprints(rows as Sprint[]));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  function resetForm() {
    setName("");
    setGoal("");
    setStartDate("");
    setEndDate("");
  }

  async function handleCreate() {
    if (!name.trim() || !startDate || !endDate) return;
    const sprint = await createSprintLocal(name.trim(), goal.trim() || null, startDate, endDate);
    if (sprint) {
      setSprints((prev) => [sprint, ...prev]);
      onSelect(sprint.id);
      setOpen(false);
      resetForm();
    }
  }

  async function handleStatusChange(sprintId: string, status: "planned" | "active" | "completed") {
    await updateSprintStatusLocal(sprintId, status);
    setSprints((prev) =>
      prev.map((s) => (s.id === sprintId ? { ...s, status } : s)),
    );
  }

  const activeSprint = sprints.find((s) => s.id === selectedSprintId);

  return (
    <div className="sprint-selector">
      <div className="sprint-selector-row">
        <select
          className="sprint-select"
          value={selectedSprintId ?? ""}
          onChange={(e) => onSelect(e.target.value || null)}
        >
          <option value="">Product Backlog (all)</option>
          {sprints.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.status})
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn-add btn-small"
          onClick={() => setOpen(true)}
        >
          + Sprint
        </button>
      </div>

      {activeSprint?.goal ? (
        <p className="sprint-goal">
          <strong>Sprint Goal:</strong> {activeSprint.goal}
        </p>
      ) : null}

      {activeSprint ? (
        <div className="sprint-meta">
          <span>{activeSprint.start_date} – {activeSprint.end_date}</span>
          <span className={`chip chip--${activeSprint.status}`}>{activeSprint.status}</span>
          {activeSprint.status === "planned" ? (
            <button type="button" className="btn-small" onClick={() => handleStatusChange(activeSprint.id, "active")}>
              Start sprint
            </button>
          ) : null}
          {activeSprint.status === "active" ? (
            <button type="button" className="btn-small" onClick={() => handleStatusChange(activeSprint.id, "completed")}>
              Complete sprint
            </button>
          ) : null}
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New sprint</DialogTitle>
            <DialogDescription>
              Create a sprint to plan and track a time-boxed iteration.
            </DialogDescription>
          </DialogHeader>

          <div className="sprint-create-form">
            <label className="field">
              <span>Sprint name</span>
              <input
                className="input"
                type="text"
                placeholder="e.g. Sprint 1"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Sprint goal (optional)</span>
              <input
                className="input"
                type="text"
                placeholder="What should this sprint achieve?"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            </label>
            <div className="form-row">
              <label className="field">
                <span>Start</span>
                <input
                  className="input"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </label>
              <label className="field">
                <span>End</span>
                <input
                  className="input"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </label>
            </div>
          </div>

          <DialogFooter>
            <button type="button" className="btn-small" onClick={() => { setOpen(false); resetForm(); }}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-add"
              onClick={handleCreate}
              disabled={!name.trim() || !startDate || !endDate}
            >
              Create sprint
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
