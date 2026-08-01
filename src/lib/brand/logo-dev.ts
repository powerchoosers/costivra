import "server-only";

const LOGO_DEV_IMAGE_HOST = "img.logo.dev";

function domainFromWebsite(website: string | null): string | null {
  if (!website) return null;
  try {
    const value = website.includes("://") ? website : `https://${website}`;
    const hostname = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
    return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(hostname)
      ? hostname
      : null;
  } catch {
    return null;
  }
}

export function logoDevReference(name: string, website: string | null) {
  const domain = domainFromWebsite(website);
  const path = domain
    ? `/${domain}`
    : `/name/${encodeURIComponent(name.trim().slice(0, 160))}`;
  return `https://${LOGO_DEV_IMAGE_HOST}${path}?size=128&format=png&fallback=404`;
}

export async function fetchLogoDevImage(reference: string) {
  const token = process.env.LOGODEV_PUBLISHABLE_KEY ?? process.env.LOGODEV_API_KEY;
  if (!token) return null;
  const url = new URL(reference);
  if (url.protocol !== "https:" || url.hostname !== LOGO_DEV_IMAGE_HOST) return null;
  url.searchParams.set("token", token);
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !contentType.startsWith("image/")) return null;
  return { body: await response.arrayBuffer(), contentType };
}
