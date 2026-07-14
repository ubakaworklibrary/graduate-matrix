"use client";

import { createBrowserClient } from "@supabase/ssr";
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

export function createClient() {
  const supabaseUrl = requireEnvironmentValue(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    "NEXT_PUBLIC_SUPABASE_URL",
  );
  const supabasePublishableKey = requireEnvironmentValue(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );

  return createBrowserClient<Database>(supabaseUrl, supabasePublishableKey);
}
