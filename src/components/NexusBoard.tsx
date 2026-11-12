"use client";

import { useState, useTransition } from "react";

import {
  assignTodoToNexusStreamAction,
  createNexusStreamAction,
  deleteNexusStreamAction,
} from "@/app/actions/nexus";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { NexusStream } from "@/lib/data/nexus";

interface Props {
  organizationId: string;
  streams: NexusStream[];
  /** Tasks that can be moved into a Nexus stream (id + title). */
  tasks: { id: string; title: string }[];
}

const PURPOSE_LABEL: Record<NexusStream["purpose"], string> = {
  integration: "Integration",
  architecture_quality: "Architecture & Quality",
  governance: "Governance",
};

export function NexusBoard({ organizationId, streams, tasks }: Props) {
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState<NexusStream["purpose"]>("integration");
  const [pending, startTransition] = useTransition();

  function create() {
    if (!name.trim()) return;
    startTransition(async () => {
      await createNexusStreamAction(organizationId, name, purpose);
      setName("");
      window.location.reload();
    });
  }

  function move(todoId: string, streamId: string) {
    startTransition(async () => {
      await assignTodoToNexusStreamAction(todoId, streamId || null);
      window.location.reload();
    });
  }

  function remove(streamId: string) {
    startTransition(async () => {
      await deleteNexusStreamAction(streamId);
      window.location.reload();
    });
  }

  return (
    <section className="card nexus-board">
      <h2 className="card-title">Nexus</h2>
      <p className="card-sub">
        Several teams, one product. The Nexus Integration Team keeps three
        backlogs: integration, architecture &amp; quality, and governance.
      </p>

      {streams.length === 0 ? (
        <p className="empty">No Nexus streams yet - create one below.</p>
      ) : (
        <ul className="nexus-list">
          {streams.map((stream) => (
            <li key={stream.id} className="nexus-stream">
              <div className="nexus-stream-head">
                <strong>{stream.name}</strong>
                <span className="chip chip--role">
                  {PURPOSE_LABEL[stream.purpose]}
                </span>
                <button
                  type="button"
                  className="btn-ghost btn-small"
                  onClick={() => remove(stream.id)}
                  disabled={pending}
                >
                  Remove
                </button>
              </div>

              <label className="field">
                <span>Move a task into this stream</span>
                <select
                  defaultValue=""
                  onChange={(event) => {
                    if (event.target.value) move(event.target.value, stream.id);
                  }}
                  disabled={pending}
                >
                  <option value="">Pick a task...</option>
                  {tasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </select>
              </label>
            </li>
          ))}
        </ul>
      )}

      <div className="inline-form nexus-create">
        <Label className="field w-full">
          <span>New stream</span>
          <input
            className="input"
            type="text"
            placeholder="e.g. Integration"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Label>

        <select
          className="nexus-purpose"
          value={purpose}
          onChange={(event) =>
            setPurpose(event.target.value as NexusStream["purpose"])
          }
          aria-label="Nexus stream purpose"
        >
          <option value="integration">Integration</option>
          <option value="architecture_quality">Architecture &amp; Quality</option>
          <option value="governance">Governance</option>
        </select>

        <Button type="button" onClick={create} disabled={pending}>
          Add stream
        </Button>
      </div>
    </section>
  );
}
