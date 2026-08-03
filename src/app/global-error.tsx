"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("costivra.global_render_error", {
      digest: error.digest ?? "unavailable",
      name: error.name,
    });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="runtime-error-page">
          <section className="runtime-error-card" role="alert">
            <p className="eyebrow">Costivra</p>
            <h1>The application needs a fresh start.</h1>
            <p>No action was completed from this interrupted view.</p>
            <button className="button button-primary" type="button" onClick={reset}>
              <RotateCcw size={16} /> Reload application
            </button>
            {error.digest && <small>Reference {error.digest}</small>}
          </section>
        </main>
      </body>
    </html>
  );
}
