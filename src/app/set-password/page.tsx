import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { PasswordSetup } from "@/components/password-setup";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Set owner password",
  robots: { index: false, follow: false },
};

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; code?: string; error?: string }>;
}) {
  const { error } = await searchParams;
  let initialReady = false;
  let initialUserEmail: string | null = null;

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      },
    );

    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims as
      | { email?: string; user_metadata?: { internal_owner_invite?: boolean } }
      | null
      | undefined;
    initialReady = Boolean(claims);
    initialUserEmail = claims?.email ?? null;
  } catch {
    // Fall back to client verification if server cookie check fails
  }

  return (
    <PasswordSetup
      initialReady={initialReady}
      initialUserEmail={initialUserEmail}
      serverError={error ?? (!initialReady ? "missing_session" : null)}
    />
  );
}
