import Link from "next/link";
import { Building2, Globe2, MapPin, ReceiptText } from "lucide-react";
import type { ReactNode } from "react";

export type PageScopeMode = "global" | "vendor" | "account" | "invoice";

export type ScopeBreadcrumb = {
  label: string;
  href?: string;
};

export function PageScopeIndicator({
  mode,
  vendorName,
  vendorHref,
  accountLabel,
  accountHref,
  detailLabel,
}: {
  mode: PageScopeMode;
  vendorName?: string;
  vendorHref?: string;
  accountLabel?: string;
  accountHref?: string;
  detailLabel?: string;
}) {
  const Icon = mode === "global" ? Globe2 : mode === "vendor" ? Building2 : mode === "invoice" ? ReceiptText : MapPin;
  const label = mode === "global" ? "Across all vendors" : mode === "vendor" ? "Vendor workspace" : mode === "invoice" ? "Invoice review" : "Vendor account";
  const detail = mode === "global" ? "Every vendor relationship" : mode === "vendor" ? vendorName ?? "Vendor relationship" : mode === "invoice" ? detailLabel ?? "Invoice record" : accountLabel ?? "Account details";
  const detailNode = mode === "account" && accountHref ? <Link href={accountHref}>{detail}</Link> : mode !== "global" && vendorHref ? <Link href={vendorHref}>{detail}</Link> : <span>{detail}</span>;

  return (
    <div className={`page-scope-indicator page-scope-indicator--${mode}`} aria-label={`${label}: ${detail}`}>
      <Icon size={15} aria-hidden="true" />
      <span><strong>{label}</strong>{detailNode}</span>
    </div>
  );
}

export function PageBreadcrumbs({ items }: { items: ScopeBreadcrumb[] }) {
  return (
    <nav className="page-breadcrumbs" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`}>
          {index > 0 && <span className="page-breadcrumbs__separator" aria-hidden="true">/</span>}
          {item.href && index < items.length - 1 ? <Link href={item.href}>{item.label}</Link> : <span aria-current={index === items.length - 1 ? "page" : undefined}>{item.label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function ScopeContext({ children }: { children: ReactNode }) {
  return <div className="scope-context">{children}</div>;
}
