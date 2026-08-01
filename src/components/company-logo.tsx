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
  const [loaded, setLoaded] = useState(false);
  const initial = name.trim().slice(0, 1).toUpperCase() || "?";
  if (failed) return <span className={`company-logo company-logo--fallback ${className}`} aria-label={`${name} logo unavailable`}>{initial}</span>;
  return <img className={`company-logo${loaded ? " is-loaded" : ""} ${className}`} src={`/api/logos/${entity}/${id}`} alt={`${name} logo`} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />;
}
