import { cleanText } from "@/lib/portal/http";

export type LocationInput = {
  name: string;
  status: "active" | "inactive";
  address: Record<string, string> | null;
};

export function locationInput(body: Record<string, unknown>): LocationInput | null {
  const name = cleanText(body.name, 120);
  if (!name) return null;

  const requestedStatus = cleanText(body.status, 20).toLowerCase();
  const status = requestedStatus === "inactive" ? "inactive" : "active";
  const address = {
    line1: cleanText(body.line1, 160),
    line2: cleanText(body.line2, 160),
    city: cleanText(body.city, 100),
    state: cleanText(body.state, 80),
    postal_code: cleanText(body.postalCode, 24),
    country: cleanText(body.country, 2).toUpperCase() || "US",
  };
  const hasAddress = Object.entries(address).some(
    ([key, value]) => key !== "country" && Boolean(value),
  );
  return { name, status, address: hasAddress ? address : null };
}
