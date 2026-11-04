import { createAdminClient } from "@/lib/supabase/admin";

/** Atomically add XP to a profile; returns the new total (0 if not found). */
export async function addXp(userId: string, amount: number): Promise<number> {
  if (!Number.isFinite(amount) || amount === 0) {
    const { data } = await createAdminClient()
      .from("profiles")
      .select("xp")
      .eq("id", userId)
      .maybeSingle<{ xp: number }>();

    return data?.xp ?? 0;
  }

  const { data, error } = await createAdminClient().rpc("add_xp", {
    p_user_id: userId,
    p_amount: Math.round(amount),
  });

  if (error) {
    return 0;
  }

  return Number(data ?? 0);
}
