"use client";

import { ArrowRight, BadgeCheck, KeyRound, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { CostivraMark } from "@/components/brand";
import { createClient } from "@/lib/supabase/client";

export function PasswordSetup() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function establishSession() {
      const client = createClient();
      const url = new URL(window.location.href);
      let sessionError = "";
      const code = url.searchParams.get("code");
      if (code) {
        const { error } = await client.auth.exchangeCodeForSession(code);
        sessionError = error?.message ?? "";
        url.searchParams.delete("code");
        window.history.replaceState({}, "", `${url.pathname}${url.search}`);
      } else if (url.hash) {
        const hash = new URLSearchParams(url.hash.slice(1));
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");
        if (accessToken && refreshToken) {
          const { error } = await client.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          sessionError = error?.message ?? "";
          window.history.replaceState({}, "", url.pathname);
        }
      }
      const { data } = await client.auth.getSession();
      if (!active) return;
      const ownerInvite =
        data.session?.user.user_metadata?.internal_owner_invite === true;
      setReady(ownerInvite);
      if (!data.session)
        setMessage(
          sessionError ||
            "This secure link is invalid or expired. Open the newest Costivra owner password email and try again.",
        );
      else if (!ownerInvite)
        setMessage(
          "This secure link does not belong to the signed-in owner invitation. Sign out, then open the newest Costivra owner password email.",
        );
      setChecking(false);
    }
    void establishSession();
    return () => {
      active = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    if (password !== confirmation) {
      setMessage("The two passwords do not match.");
      return;
    }
    setBusy(true);
    setMessage("");
    const client = createClient();
    const { error } = await client.auth.updateUser({
      password,
      data: { internal_owner_invite: false },
    });
    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }
    router.replace("/manage");
    router.refresh();
  }

  return (
    <main className="paper-texture">
      <div className="container content-page">
        <div className="account-page">
          <aside className="account-intro">
            <div className="account-intro-mark">
              <span className="account-brand-mark">
                <CostivraMark size={34} />
              </span>
              <span>Costivra owner access</span>
            </div>
            <div>
              <p className="eyebrow">Private account setup</p>
              <h1>Choose the password only you know.</h1>
              <p>
                This step activates your internal Costivra access. Mailbox seats
                and customer records remain separate from login permissions.
              </p>
            </div>
            <div className="account-trust">
              <span>
                <LockKeyhole aria-hidden="true" size={16} /> Secure invite only
              </span>
              <span>
                <BadgeCheck aria-hidden="true" size={16} /> Owner access audited
              </span>
            </div>
          </aside>
          <form className="account-card" onSubmit={submit}>
            <div className="account-card-heading">
              <span className="account-card-kicker">Owner credentials</span>
              <h2>Set your permanent password.</h2>
              <p>Use at least 12 characters and do not reuse another password.</p>
            </div>
            <KeyRound aria-hidden="true" size={28} className="card-icon" />
            <div className="account-fields">
              <div className="field">
                <label htmlFor="owner-password">New password</label>
                <input
                  id="owner-password"
                  name="password"
                  type="password"
                  minLength={12}
                  autoComplete="new-password"
                  required
                  disabled={!ready || busy}
                />
              </div>
              <div className="field">
                <label htmlFor="owner-password-confirmation">
                  Confirm password
                </label>
                <input
                  id="owner-password-confirmation"
                  name="confirmation"
                  type="password"
                  minLength={12}
                  autoComplete="new-password"
                  required
                  disabled={!ready || busy}
                />
              </div>
            </div>
            {message && <p className="account-message" role="alert">{message}</p>}
            <button
              className="button button-primary account-submit"
              disabled={!ready || busy || checking}
            >
              {checking ? "Checking secure link…" : busy ? "Saving…" : "Set password"}
              <ArrowRight aria-hidden="true" size={17} />
            </button>
            <p className="account-switch">
              Already finished? <Link href="/login?next=/manage">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
