import { createBrowserClient } from "@supabase/ssr";

import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

/** Browser Supabase client — reads the auth cookies set by the server actions. */
export function createClientSupabaseClient() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey());
}
