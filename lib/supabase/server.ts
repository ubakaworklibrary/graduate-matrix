import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

function requireEnvironmentValue(
  value: string | undefined,
  name: string,
): string {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export async function createClient() {
  const cookieStore = await cookies();
  const supabaseUrl = requireEnvironmentValue(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    "NEXT_PUBLIC_SUPABASE_URL",
  );
  const supabasePublishableKey = requireEnvironmentValue(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );

  return createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
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
          // Server Components can read cookies but cannot write them.
        }
      },
    },
  });
}
