import { ArrowRight, BadgeCheck, KeyRound, LockKeyhole } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CostivraMark } from "@/components/brand";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Confirm password recovery",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function ConfirmRecoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string }>;
}) {
  const { token_hash: tokenHash } = await searchParams;
  const validRequest = typeof tokenHash === "string" && tokenHash.length > 0;

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
              <p className="eyebrow">Private account recovery</p>
              <h1>One deliberate step keeps your link secure.</h1>
              <p>
                Continue only if you requested a Costivra password reset. This
                confirmation prevents email scanners from using your one-time link.
              </p>
            </div>
            <div className="account-trust">
              <span>
                <LockKeyhole aria-hidden="true" size={16} /> Single-use recovery
              </span>
              <span>
                <BadgeCheck aria-hidden="true" size={16} /> Costivra domain verified
              </span>
            </div>
          </aside>
          <section className="account-card">
            <div className="account-card-heading">
              <span className="account-card-kicker">Secure confirmation</span>
              <h2>{validRequest ? "Continue to set your password." : "This link is incomplete."}</h2>
              <p>
                {validRequest
                  ? "Your password will not change until you choose and save a new one on the next screen."
                  : "Request a fresh password email from the Costivra sign-in page."}
              </p>
            </div>
            <KeyRound aria-hidden="true" size={28} className="card-icon" />
            {validRequest ? (
              <form action="/auth/confirm" method="post">
                <input type="hidden" name="token_hash" value={tokenHash} />
                <button className="button button-primary account-submit" type="submit">
                  Continue securely <ArrowRight aria-hidden="true" size={17} />
                </button>
              </form>
            ) : (
              <Link className="button button-primary account-submit" href="/login">
                Return to sign in <ArrowRight aria-hidden="true" size={17} />
              </Link>
            )}
            <p className="account-switch">
              Did not request this? <Link href="/login">Return to sign in</Link>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
