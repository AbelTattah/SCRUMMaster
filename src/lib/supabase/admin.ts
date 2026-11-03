import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { supabaseServiceRoleKey, supabaseUrl } from "@/lib/env";

let admin: SupabaseClient | null = null;

/**
 * Service-role client. It bypasses row level security, so every caller must
 * first establish the signed-in user and scope each query to that user.
 */
export function createAdminClient(): SupabaseClient {
  if (!admin) {
    admin = createClient(supabaseUrl(), supabaseServiceRoleKey(), {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return admin;
}
