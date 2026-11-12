"use server";

import { requireOnboardedUser } from "@/lib/auth";
import {
  listDailyScrum,
  listSprintReviews,
  saveDailyScrum,
  saveSprintReview,
} from "@/lib/data/scrumEvents";

export async function loadSprintReviews(sprintId: string) {
  await requireOnboardedUser();
  return listSprintReviews(sprintId);
}

export async function saveSprintReviewAction(
  sprintId: string,
  wentWell: string,
  toImprove: string,
  actionItems: string,
) {
  const current = await requireOnboardedUser();
  return saveSprintReview(
    sprintId,
    current.id,
    wentWell.trim() || null,
    toImprove.trim() || null,
    actionItems.trim() || null,
  );
}

export async function loadDailyScrumEntries(sprintId: string) {
  await requireOnboardedUser();
  return listDailyScrum(sprintId);
}

export async function saveDailyScrumAction(
  sprintId: string,
  yesterday: string,
  today: string,
  blockers: string,
) {
  const current = await requireOnboardedUser();
  return saveDailyScrum(
    sprintId,
    current.id,
    yesterday.trim() || null,
    today.trim() || null,
    blockers.trim() || null,
  );
}
