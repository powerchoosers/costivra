import { NextResponse } from "next/server";
import { apiError, cleanText } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";

/**
 * GET /api/portal/vendor-catalog
 * Returns paginated vendor catalog entries.
 * Uses vendors.canonical_name — no vendors.name column exists.
 */
export async function GET(request: Request) {
  try {
    const { db } = await requirePortalContext();
    const url = new URL(request.url);
    const q = cleanText(url.searchParams.get("q"), 100);
    const category = cleanText(url.searchParams.get("category"), 100);
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)));

    let query = db
      .from("vendors")
      .select("id, canonical_name, category, website, logo_url, catalog_status, search_aliases")
      .in("catalog_status", ["verified", "candidate"])
      .order("catalog_status", { ascending: true }) // verified sorts before candidate
      .order("canonical_name", { ascending: true })
      .limit(limit);

    if (q) {
      // Search canonical_name and normalized_name — no name column
      query = query.or(`canonical_name.ilike.%${q}%,normalized_name.ilike.%${q}%`);
    }

    if (category) {
      query = query.eq("category", category);
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    const entries = (rows ?? []).map((row) => ({
      id: row.id,
      name: row.canonical_name,            // map canonical_name -> name for UI consumption
      category: row.category ?? "General",
      website: row.website ?? null,
      logoUrl: row.logo_url ?? null,
      catalogStatus: row.catalog_status,
      isSuggested: row.catalog_status === "candidate",
      aliases: row.search_aliases ?? [],
    }));

    return NextResponse.json({ entries });
  } catch (error) {
    return apiError(error);
  }
}
