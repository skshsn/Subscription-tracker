import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// RLS-scoped client for use in Server Components, Server Actions, and
// Route Handlers. cookies() is async-only in Next.js 16.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component with no request/response to
            // write to -- safe to ignore as long as proxy.ts refreshes
            // the session on every navigation.
          }
        },
      },
    },
  );
}

/**
 * Server Actions must not rely on proxy.ts alone for auth: Next.js 16's
 * own docs note that a Server Function is invoked as a POST to whatever
 * route it's defined on, so a proxy matcher change can silently drop
 * coverage. Every mutating action should call this first.
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  return { supabase, user };
}
