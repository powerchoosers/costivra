"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CostivraMark } from "@/components/brand";
import { createClient } from "@/lib/supabase/client";

export function ManageAccessDenied() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function switchAccount() {
    setBusy(true);
    await createClient().auth.signOut();
    router.replace("/login?next=/manage");
    router.refresh();
  }
  return (
    <main className="manage-access-page">
      <section>
        <span className="costivra-access-mark">
          <CostivraMark size={42} />
        </span>
        <small>COSTIVRA OWNER OPERATIONS</small>
        <h1>This account is not on the internal access list.</h1>
        <p>
          Customer workspace access does not grant access to the cross-client
          CRM. Sign in with the exact email configured by Costivra, or add it to{" "}
          <code>COSTIVRA_INTERNAL_ADMIN_EMAILS</code> in the server environment.
        </p>
        <div>
          <button
            className="manage-button manage-button--primary"
            type="button"
            disabled={busy}
            onClick={() => void switchAccount()}
          >
            {busy ? "Signing out…" : "Use another account"}
          </button>
          <Link className="manage-button manage-button--quiet" href="/app">
            Customer workspace
          </Link>
        </div>
      </section>
    </main>
  );
}
