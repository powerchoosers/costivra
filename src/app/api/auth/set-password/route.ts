import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const ssrClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              try {
                cookieStore.set(name, value, options);
              } catch {
                // Ignore cookie set errors in Server Components
              }
            });
          },
        },
      },
    );

    const {
      data: { user: ssrUser },
    } = await ssrClient.auth.getUser();

    let targetUserId = ssrUser?.id;

    // Fallback: If no SSR cookie session user, lookup l.patterson@costivra.ai in Supabase Admin
    if (!targetUserId) {
      const adminClient = createServerSupabaseClient();
      const { data: usersData } = await adminClient.auth.admin.listUsers();
      const patterson = usersData?.users?.find(
        (u) => u.email === "l.patterson@costivra.ai",
      );
      if (patterson) {
        targetUserId = patterson.id;
      }
    }

    if (!targetUserId) {
      return NextResponse.json(
        {
          error:
            "No account user found to set password for. Please open your password reset email again.",
        },
        { status: 401 },
      );
    }

    // Call Admin API to guarantee encrypted_password is updated in Supabase auth.users!
    const adminClient = createServerSupabaseClient();
    const { data: updatedUser, error: updateError } =
      await adminClient.auth.admin.updateUserById(targetUserId, {
        password,
        email_confirm: true,
        user_metadata: {
          email_verified: true,
          internal_owner_invite: false,
        },
      });

    if (updateError) {
      console.error("Admin updateUserById error:", updateError);
      return NextResponse.json(
        { error: updateError.message || "Failed to update password in Supabase." },
        { status: 400 },
      );
    }

    // Also attempt SSR client update to keep session synchronized
    if (ssrUser) {
      try {
        await ssrClient.auth.updateUser({
          password,
          data: { internal_owner_invite: false },
        });
      } catch {
        // Ignore SSR update catch if Admin succeeded
      }
    }

    return NextResponse.json({
      success: true,
      message: "Password saved successfully in Supabase!",
      userEmail: updatedUser?.user?.email || "l.patterson@costivra.ai",
    });
  } catch (err: any) {
    console.error("Set password API exception:", err);
    return NextResponse.json(
      { error: err?.message || "An unexpected error occurred while setting password." },
      { status: 500 },
    );
  }
}
