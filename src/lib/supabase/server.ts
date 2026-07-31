import { createClient } from "@supabase/supabase-js";

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured for this server environment.`);
  }

  return value;
}

/**
 * Creates a database client for trusted server code only.
 *
 * Never import this module into a Client Component and never expose the secret
 * key through a NEXT_PUBLIC_ environment variable.
 */
export function createServerSupabaseClient() {
  const url = requireEnvironmentVariable("NEXT_PUBLIC_SUPABASE_URL");
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secretKey) {
    throw new Error(
      "SUPABASE_SECRET_KEY is not configured for this server environment."
    );
  }

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
