import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

/**
 * A Supabase client bound to the current request's auth cookies.
 *
 * Use it for everything that needs the signed-in identity (auth.getUser(),
 * sign-in / sign-out, password changes). Database reads and writes that need
 * to bypass row level security go through createAdminClient() after the caller
 * has been authorized in application code.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies. The middleware refreshes the
          // session on the next request, so this is safe to ignore here.
        }
      },
    },
  });
}
