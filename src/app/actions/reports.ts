"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOnboardedUser } from "@/lib/auth";
import { fileReport } from "@/lib/data/reports";
import { dateKey } from "@/lib/time";

const MAX_FIELD = 2000;

function field(formData: FormData, name: string): string {
  const value = formData.get(name);

  return typeof value === "string" ? value.trim() : "";
}

function clip(value: string): string {
  return value.slice(0, MAX_FIELD);
}

export async function saveReport(formData: FormData): Promise<void> {
  const current = await requireOnboardedUser();

  const yesterday = clip(field(formData, "yesterday"));
  const today = clip(field(formData, "today"));
  const blockers = clip(field(formData, "blockers"));

  if (!yesterday && !today && !blockers) {
    redirect(
      `/reports?error=${encodeURIComponent(
        "Add at least one line — what happened yesterday, what is planned, or what is blocked.",
      )}`,
    );
  }

  const result = await fileReport(current.id, dateKey(), {
    yesterday,
    today,
    blockers,
  });

  revalidatePath("/", "layout");

  if (result.error) {
    redirect(`/reports?error=${encodeURIComponent(result.error)}`);
  }

  const notice = result.isNew
    ? result.streak > 1
      ? `Report filed — +${result.xp} XP, ${result.streak}-day streak.`
      : `Report filed — +${result.xp} XP.`
    : "Today's report was updated.";

  redirect(`/reports?notice=${encodeURIComponent(notice)}`);
}
