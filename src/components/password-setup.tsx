"use client";

import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
  LockKeyhole,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { CostivraMark } from "@/components/brand";
import { createClient } from "@/lib/supabase/client";

export function PasswordSetup({
  initialReady = false,
  initialUserEmail = null,
  serverError = null,
}: {
  initialReady?: boolean;
  initialUserEmail?: string | null;
  serverError?: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checking, setChecking] = useState(!initialReady);
  const [ready, setReady] = useState(initialReady);
  const [userEmail, setUserEmail] = useState<string | null>(initialUserEmail);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    serverError === "invalid_link"
      ? "This secure link is invalid or expired. Open the newest Costivra owner password email and try again."
      : "",
  );
  const [messageSuccess, setMessageSuccess] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    let active = true;
    async function establishSession() {
      const code = searchParams?.get("code");
      const hasHash = typeof window !== "undefined" && Boolean(window.location.hash);
      if (initialReady && !code && !hasHash) {
        if (active) {
          setChecking(false);
          setReady(true);
        }
        return;
      }

      try {
        const client = createClient();
        const url = new URL(window.location.href);
        const recoveryMode = url.searchParams.get("mode") === "recovery";
        let sessionError = "";

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

        const { data: { user }, error: userError } = await client.auth.getUser();
        if (!active) return;

        const ownerInvite = recoveryMode || user?.user_metadata?.internal_owner_invite === true;
        const isVerified = Boolean(user && ownerInvite);
        setReady(isVerified);
        setUserEmail(user?.email ?? null);

        if (!user) {
          setMessage(
            sessionError ||
              userError?.message ||
              "This secure link is invalid or expired. Open the newest Costivra owner password email and try again.",
          );
        } else if (!ownerInvite) {
          setMessage(
            "This secure link does not belong to the signed-in owner invitation. Sign out, then open the newest Costivra owner password email.",
          );
        }
      } catch (err: any) {
        if (!active) return;
        setMessage(err?.message || "Unable to verify secure link. Please try again.");
      } finally {
        if (active) {
          setChecking(false);
        }
      }
    }

    void establishSession();
    return () => {
      active = false;
    };
  }, [initialReady, searchParams]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessageSuccess(false);

    if (!password) {
      setMessage("Please enter a new password.");
      return;
    }
    if (password.length < 8) {
      setMessage("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmation) {
      setMessage("The two passwords do not match. Please verify both fields.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      // 1. Call server API endpoint using Supabase Admin API to guarantee encrypted_password is set
      const response = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error("Set password API error:", data);
        setMessage(data.error || "Failed to update password. Please try again.");
        setBusy(false);
        return;
      }

      // 2. Also update browser client session if active
      try {
        const client = createClient();
        await client.auth.updateUser({ password });
        // Attempt sign in with new password to refresh session cookies
        const targetEmail = userEmail || data.userEmail || "l.patterson@costivra.ai";
        await client.auth.signInWithPassword({
          email: targetEmail,
          password,
        });
      } catch {
        // Ignore client session error if server update succeeded
      }

      setMessageSuccess(true);
      setMessage("Password saved successfully in Supabase! Redirecting to your workspace...");
      setTimeout(() => {
        window.location.href = "/access";
      }, 1000);
    } catch (err: any) {
      console.error("Password update exception:", err);
      setMessage(err?.message || "An unexpected error occurred while updating your password. Please try again.");
      setBusy(false);
    }
  }

  const lengthValid = password.length >= 8;
  const passwordsMatch = password.length > 0 && confirmation.length > 0 && password === confirmation;
  const showMismatch = confirmation.length > 0 && password !== confirmation;

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
              <p>
                {userEmail
                  ? `Set a new password for ${userEmail}.`
                  : "Choose a secure password to protect your account."}
              </p>
            </div>
            <div className="account-fields">
              <div className="field">
                <label htmlFor="owner-password">New password</label>
                <div className="password-input-wrapper">
                  <input
                    id="owner-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    minLength={8}
                    autoComplete="new-password"
                    required
                    disabled={busy}
                    className={
                      password.length >= 8
                        ? "is-valid"
                        : password.length > 0
                        ? "is-invalid"
                        : ""
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onInput={(e) => setPassword(e.currentTarget.value)}
                    placeholder="Enter your new password"
                  />
                  <button
                    type="button"
                    className={`password-toggle-button ${showPassword ? "is-visible" : ""}`}
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    <span>{showPassword ? "Hide" : "Show"}</span>
                  </button>
                </div>
              </div>
              <div className="field">
                <label htmlFor="owner-password-confirmation">
                  Confirm password
                </label>
                <div className="password-input-wrapper">
                  <input
                    id="owner-password-confirmation"
                    name="confirmation"
                    type={showConfirmation ? "text" : "password"}
                    minLength={8}
                    autoComplete="new-password"
                    required
                    disabled={busy}
                    className={
                      passwordsMatch
                        ? "is-valid"
                        : showMismatch
                        ? "is-invalid"
                        : ""
                    }
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                    onInput={(e) => setConfirmation(e.currentTarget.value)}
                    placeholder="Re-enter your new password"
                  />
                  <button
                    type="button"
                    className={`password-toggle-button ${showConfirmation ? "is-visible" : ""}`}
                    onClick={() => setShowConfirmation((prev) => !prev)}
                    aria-label={showConfirmation ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmation ? <EyeOff size={15} /> : <Eye size={15} />}
                    <span>{showConfirmation ? "Hide" : "Show"}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="password-intelligence-strip" aria-live="polite">
              <span
                className={`password-pill ${
                  lengthValid ? "password-pill--success" : "password-pill--neutral"
                }`}
              >
                {lengthValid ? <Check size={14} /> : <Info size={14} />}
                8+ characters
              </span>
              {passwordsMatch && (
                <span className="password-pill password-pill--success">
                  <CheckCircle2 size={14} /> Passwords match
                </span>
              )}
              {showMismatch && (
                <span className="password-pill password-pill--warning">
                  <AlertCircle size={14} /> Passwords do not match
                </span>
              )}
            </div>

            {message && (
              <p
                className={`account-message ${messageSuccess ? "account-message--success" : ""}`}
                role="alert"
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              className="button button-primary account-submit"
              disabled={busy || checking}
            >
              {checking ? "Checking secure link…" : busy ? "Saving password…" : "Set password"}
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
