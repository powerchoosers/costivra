"use client";

import { useState } from "react";

export function CompanyLogo({
  entity,
  id,
  name,
  className = "",
}: {
  entity: "organization" | "vendor";
  id: string;
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const initial = name.trim().slice(0, 1).toUpperCase() || "?";
  if (failed) return <span className={`company-logo company-logo--fallback ${className}`} aria-label={`${name} logo unavailable`}>{initial}</span>;
  // This authenticated route returns either a short-lived provider logo or a
  // private fallback; bypassing Next's public image optimizer is intentional.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={`company-logo ${className}`} src={`/api/logos/${entity}/${id}`} alt={`${name} logo`} onError={() => setFailed(true)} />;
}
