"use client";

import { useEffect, useMemo, useState } from "react";

import { addMember, removeMember } from "@/app/actions/team";
import { ActivateMemberButton } from "@/components/ActivateMemberButton";
import { ConfirmForm } from "@/components/ConfirmForm";
import type { MemberGrantStatus } from "@/lib/data/grants";
import type { Member } from "@/lib/types";
import { avatarUrl } from "@/lib/utils";

const PAGE_SIZE = 24;

export function TeamMembers({
  members,
  grantStatus,
}: {
  members: Member[];
  grantStatus: Record<string, MemberGrantStatus>;
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();

    if (!needle) {
      return members;
    }

    return members.filter((member) => member.name.toLowerCase().includes(needle));
  }, [members, q]);

  useEffect(() => {
    setPage(1);
  }, [q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage);
    }
  }, [page, safePage]);

  return (
    <>
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

      <div className="list-tools">
        <input
          className="list-search"
          type="search"
          placeholder="Search members…"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          aria-label="Search members"
        />
        {filtered.length > 0 ? (
          <span className="list-count">
            {filtered.length} member{filtered.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <p className="empty">No members match &ldquo;{q.trim()}&rdquo;.</p>
      ) : (
        <div className="member-chips">
          {paged.map((member) => {
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
      )}

      {totalPages > 1 ? (
        <nav className="pager" aria-label="Member pages">
          <button
            type="button"
            className="pager-btn"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={safePage <= 1}
          >
            Prev
          </button>
          <span className="pager-status">
            Page {safePage} of {totalPages}
          </span>
          <button
            type="button"
            className="pager-btn"
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            disabled={safePage >= totalPages}
          >
            Next
          </button>
        </nav>
      ) : null}
    </>
  );
}
