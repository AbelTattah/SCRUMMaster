"use client";

import { useEffect, useMemo, useState } from "react";

import { levelFor } from "@/lib/gamification";
import type { Member } from "@/lib/types";
import { avatarUrl } from "@/lib/utils";

const PAGE_SIZE = 15;

export function TeamLeaderboard({ members }: { members: Member[] }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const ranked = useMemo(() => {
    const sorted = [...members].sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name));
    const needle = q.trim().toLowerCase();

    if (!needle) {
      return sorted;
    }

    return sorted.filter((member) => member.name.toLowerCase().includes(needle));
  }, [members, q]);

  useEffect(() => {
    setPage(1);
  }, [q]);

  const totalPages = Math.max(1, Math.ceil(ranked.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = ranked.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage);
    }
  }, [page, safePage]);

  return (
    <>
      <div className="list-tools">
        <input
          className="list-search"
          type="search"
          placeholder="Search leaderboard…"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          aria-label="Search leaderboard"
        />
        {ranked.length > 0 ? (
          <span className="list-count">
            {ranked.length} member{ranked.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {ranked.length === 0 ? (
        <p className="empty">No members match &ldquo;{q.trim()}&rdquo;.</p>
      ) : (
        <ol className="leaderboard" start={(safePage - 1) * PAGE_SIZE + 1}>
          {paged.map((member, index) => {
            const rank = (safePage - 1) * PAGE_SIZE + index + 1;

            return (
              <li className="leader-row" key={member.id}>
                <span className={`leader-rank${rank <= 3 ? ` is-top-${rank}` : ""}`}>
                  {rank}
                </span>

                <img
                  className="leader-avatar"
                  src={avatarUrl(member.avatar_url, member.name, member.id)}
                  alt=""
                />

                <span className="leader-name">
                  {member.name}
                  {member.is_owner ? <span className="chip chip--owner">Owner</span> : null}
                </span>

                <span className="leader-level">Lv {levelFor(member.xp)}</span>
                <span className="leader-xp">{member.xp} XP</span>

                {member.invited_at ? (
                  <span className="chip-pending" title="They have not signed in yet">
                    Invite pending
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}

      {totalPages > 1 ? (
        <nav className="pager" aria-label="Leaderboard pages">
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
