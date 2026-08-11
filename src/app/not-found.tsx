import Link from "next/link";
import { ArrowLeft } from "@/lib/icons";
import { CostivraMark } from "@/components/brand";

export default function NotFound() {
  return (
    <main className="runtime-error-page">
      <section className="runtime-error-card">
        <span className="runtime-error-brand"><CostivraMark size={36} /></span>
        <p className="eyebrow">Page not found</p>
        <h1>There is nothing at this address.</h1>
        <p>Use the public site or return to your Costivra workspace.</p>
        <div>
          <Link className="button button-primary" href="/">
            <ArrowLeft size={16} /> Public site
          </Link>
          <Link className="button button-secondary" href="/app">Open workspace</Link>
        </div>
      </section>
    </main>
  );
}
