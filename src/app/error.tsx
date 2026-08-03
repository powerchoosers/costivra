"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { CostivraMark } from "@/components/brand";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("costivra.client_render_error", {
      digest: error.digest ?? "unavailable",
      name: error.name,
    });
  }, [error]);

  return (
    <main className="runtime-error-page">
      <section className="runtime-error-card" role="alert">
        <span className="runtime-error-brand"><CostivraMark size={36} /></span>
        <p className="eyebrow">The workspace paused safely</p>
        <h1>This view could not finish loading.</h1>
        <p>Your records were not changed. Try the view again, or return to the command center.</p>
        <div>
          <button className="button button-primary" type="button" onClick={reset}>
            <RotateCcw size={16} /> Try again
          </button>
          <Link className="button button-secondary" href="/app">
            <ArrowLeft size={16} /> Command Center
          </Link>
        </div>
        {error.digest && <small>Reference {error.digest}</small>}
      </section>
    </main>
  );
}
