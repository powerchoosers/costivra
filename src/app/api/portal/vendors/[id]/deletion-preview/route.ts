import { NextResponse } from "next/server";
import { requirePortalContext } from "@/lib/portal/repository";
import { apiError, cleanUuid } from "@/lib/portal/http";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db, organizationId } = await requirePortalContext();
    const relationshipId = cleanUuid((await params).id);
    if (!relationshipId) {
      return NextResponse.json({ error: "Invalid vendor relationship ID." }, { status: 400 });
    }

    const { data: rel } = await db
      .from("organization_vendors")
      .select("id, vendor_id, display_name_override, vendors(canonical_name)")
      .eq("id", relationshipId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!rel) {
      return NextResponse.json({ error: "Vendor relationship not found." }, { status: 404 });
    }

    const vendorName = rel.display_name_override || (rel.vendors as unknown as { canonical_name: string })?.canonical_name || "Vendor";

    const [expRes, conRes, invRes, docRes] = await Promise.all([
      db.from("expenses").select("id", { count: "exact" }).eq("organization_id", organizationId).eq("vendor_id", rel.vendor_id),
      db.from("contracts").select("id", { count: "exact" }).eq("organization_id", organizationId).eq("vendor_id", rel.vendor_id),
      db.from("invoices").select("id", { count: "exact" }).eq("organization_id", organizationId).eq("vendor_id", rel.vendor_id),
      db.from("documents").select("id", { count: "exact" }).eq("organization_id", organizationId).eq("vendor_id", rel.vendor_id),
    ]);

    const expenses = expRes.count ?? 0;
    const contracts = conRes.count ?? 0;
    const invoices = invRes.count ?? 0;
    const documents = docRes.count ?? 0;

    const hasFinancials = expenses > 0 || contracts > 0 || invoices > 0;

    return NextResponse.json({
      relationshipId,
      vendorName,
      blocked: hasFinancials,
      blockReason: hasFinancials
        ? "This vendor has saved financial records or contracts in your workspace. You must End Relationship instead of removing it."
        : undefined,
      counts: [
        { label: "Expenses", count: expenses },
        { label: "Contracts", count: contracts },
        { label: "Invoices", count: invoices },
        { label: "Documents", count: documents },
      ],
    });
  } catch (error) {
    return apiError(error, "Failed to load deletion preview.");
  }
}
