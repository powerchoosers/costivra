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
} from "@/lib/icons";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { CostivraMark } from "@/components/brand";
import {
  MIN_PASSWORD_LENGTH,
  passwordMeetsMinimumLength,
  validatePasswordUpdate,
} from "@/lib/auth/password-policy";

const PASSWORD_UPDATE_TIMEOUT_MS = 15_000;

const SERVER_MESSAGES: Record<string, string> = {
  invalid_link:
    "This reset link is invalid or has already been used. Request a new link below.",
  missing_session:
    "This page does not have an active recovery session. Request a new link below.",
  invalid_session:
    "Your recovery session expired before the password was saved. Request a new link below.",
  password_short: `Your password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
  password_mismatch: "The two passwords did not match.",
  save_failed: "We could not save your password. Request a new link and try again.",
};

function OwnerAccessIntro() {
  return (
    <aside className="account-intro">
      <div className="account-intro-mark">
        <span className="account-brand-mark">
          <CostivraMark size={34} />
        </span>
        <span className="account-brand-wordmark">Costivra owner access</span>
      </div>
      <div>
        <p className="eyebrow">Private account setup</p>
        <h1>Choose the password only you know.</h1>
        <p>
          This step activates your internal Costivra access. Mailbox seats and
          customer records remain separate from login permissions.
        </p>
      </div>
      <div className="account-trust">
        <span>
          <LockKeyhole aria-hidden="true" size={16} /> Secure reset only
        </span>
        <span>
          <BadgeCheck aria-hidden="true" size={16} /> Owner access audited
        </span>
      </div>
    </aside>
  );
}

export function PasswordSetup({
  initialReady = false,
  initialUserEmail = null,
  serverError = null,
}: {
  initialReady?: boolean;
  initialUserEmail?: string | null;
  serverError?: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    serverError ? SERVER_MESSAGES[serverError] ?? "We could not open this reset link." : "",
  );
  const [messageSuccess, setMessageSuccess] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  if (!initialReady) {
    return (
      <main className="paper-texture">
        <div className="container content-page">
          <div className="account-page">
            <OwnerAccessIntro />
            <section className="account-card">
              <div className="account-card-heading">
                <span className="account-card-kicker">Reset link needed</span>
                <h2>This password page is no longer active.</h2>
                <p>
                  {message ||
                    "The recovery session is missing or expired. No password was changed."}
                </p>
              </div>
              <Link
                className="button button-primary account-submit"
                href="/login?mode=recovery"
              >
                Request a new reset link <ArrowRight aria-hidden="true" size={17} />
              </Link>
              <p className="account-switch">
                Already changed it? <Link href="/login?next=/manage">Sign in</Link>
              </p>
            </section>
          </div>
        </div>
      </main>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextPassword = String(formData.get("password") ?? "");
    const nextConfirmation = String(formData.get("confirmation") ?? "");
    setPassword(nextPassword);
    setConfirmation(nextConfirmation);
    setMessageSuccess(false);

    const validation = validatePasswordUpdate(nextPassword, nextConfirmation);
    if (!validation.ok) {
      setMessage(validation.message);
      return;
    }

    setBusy(true);
    setMessage("");
    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      PASSWORD_UPDATE_TIMEOUT_MS,
    );

    try {
      const response = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: nextPassword,
          confirmation: nextConfirmation,
        }),
        signal: controller.signal,
      });
      const data = (await response.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null;

      if (!response.ok || !data?.success) {
        setMessage(data?.error || "We could not save your password. Try again.");
        return;
      }

      setMessageSuccess(true);
      setMessage("Password changed. Taking you to your Costivra workspace…");
      window.setTimeout(() => {
        window.location.assign("/access?password=changed");
      }, 900);
    } catch (error) {
      setMessage(
        error instanceof DOMException && error.name === "AbortError"
          ? "Saving took too long. Check your connection and try again."
          : "We could not save your password. Try again.",
      );
    } finally {
      window.clearTimeout(timeout);
      setBusy(false);
    }
  }

  const lengthValid = passwordMeetsMinimumLength(password);
  const passwordsMatch =
    password.length > 0 && confirmation.length > 0 && password === confirmation;
  const showMismatch = confirmation.length > 0 && password !== confirmation;

  return (
    <main className="paper-texture">
      <div className="container content-page">
        <div className="account-page">
          <OwnerAccessIntro />
          <form
            className="account-card"
            action="/api/auth/set-password"
            method="post"
            onSubmit={submit}
          >
            <div className="account-card-heading">
              <span className="account-card-kicker">Owner credentials</span>
              <h2>Set your permanent password.</h2>
              <p>
                {initialUserEmail
                  ? `Set a new password for ${initialUserEmail}.`
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
                    minLength={MIN_PASSWORD_LENGTH}
                    autoComplete="new-password"
                    required
                    disabled={busy}
                    className={
                      lengthValid
                        ? "is-valid"
                        : password.length > 0
                          ? "is-invalid"
                          : ""
                    }
                    onInput={(event) => setPassword(event.currentTarget.value)}
                    placeholder={`Use at least ${MIN_PASSWORD_LENGTH} characters`}
                  />
                  <button
                    type="button"
                    className={`password-toggle-button ${showPassword ? "is-visible" : ""}`}
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    disabled={busy}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    <span>{showPassword ? "Hide" : "Show"}</span>
                  </button>
                </div>
              </div>
              <div className="field">
                <label htmlFor="owner-password-confirmation">Confirm password</label>
                <div className="password-input-wrapper">
                  <input
                    id="owner-password-confirmation"
                    name="confirmation"
                    type={showConfirmation ? "text" : "password"}
                    minLength={MIN_PASSWORD_LENGTH}
                    autoComplete="new-password"
                    required
                    disabled={busy}
                    className={
                      passwordsMatch ? "is-valid" : showMismatch ? "is-invalid" : ""
                    }
                    onInput={(event) => setConfirmation(event.currentTarget.value)}
                    placeholder="Enter the same password again"
                  />
                  <button
                    type="button"
                    className={`password-toggle-button ${showConfirmation ? "is-visible" : ""}`}
                    onClick={() => setShowConfirmation((visible) => !visible)}
                    aria-label={
                      showConfirmation ? "Hide confirmation" : "Show confirmation"
                    }
                    aria-pressed={showConfirmation}
                    disabled={busy}
                  >
                    {showConfirmation ? <EyeOff size={16} /> : <Eye size={16} />}
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
                {lengthValid
                  ? "Length requirement met"
                  : `At least ${MIN_PASSWORD_LENGTH} characters`}
              </span>
              {passwordsMatch ? (
                <span className="password-pill password-pill--success">
                  <CheckCircle2 size={14} /> Passwords match
                </span>
              ) : showMismatch ? (
                <span className="password-pill password-pill--warning">
                  <AlertCircle size={14} /> Passwords do not match
                </span>
              ) : (
                <span className="password-pill password-pill--neutral">
                  <Info size={14} /> Retype it to confirm
                </span>
              )}
            </div>

            {message && (
              <p
                className={`account-message ${
                  messageSuccess ? "account-message--success" : ""
                }`}
                role={messageSuccess ? "status" : "alert"}
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              className="button button-primary account-submit"
              disabled={busy}
            >
              {busy ? "Saving password…" : "Change password"}
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
