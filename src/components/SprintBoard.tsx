"use client";

import { useState } from "react";

import { SprintSelector } from "@/components/SprintSelector";
import { TaskBoard } from "@/components/TaskBoard";

interface SprintBoardProps {
  scope: "home" | "team";
  page: any;
  q: string;
  focusId: string;
  returnTo: string;
  members: any[];
  currentUserId: string;
  canAssign: boolean;
  autoFocusAdd: boolean;
  emptyHint?: React.ReactNode;
  guestMode?: boolean;
}

export function SprintBoard(props: SprintBoardProps) {
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);

  return (
    <>
      <SprintSelector selectedSprintId={selectedSprintId} onSelect={setSelectedSprintId} />
      <TaskBoard
        key={`${props.page}-${selectedSprintId ?? "all"}`}
        scope={props.scope}
        page={props.page}
        q={props.q}
        focusId={props.focusId}
        returnTo={props.returnTo}
        members={props.members}
        currentUserId={props.currentUserId}
        canAssign={props.canAssign}
        autoFocusAdd={props.autoFocusAdd}
        emptyHint={props.emptyHint}
        guestMode={props.guestMode}
        sprintId={selectedSprintId}
      />
    </>
  );
}
