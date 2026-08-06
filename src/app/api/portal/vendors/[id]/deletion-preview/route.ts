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

    const [accountRes, expRes, conRes, invRes, docRes, monitoringRes] = await Promise.all([
      db.from("expense_accounts").select("id", { count: "exact" }).eq("organization_id", organizationId).eq("organization_vendor_id", relationshipId),
      db.from("expenses").select("id", { count: "exact" }).eq("organization_id", organizationId).eq("organization_vendor_id", relationshipId),
      db.from("contracts").select("id", { count: "exact" }).eq("organization_id", organizationId).eq("organization_vendor_id", relationshipId),
      db.from("invoices").select("id", { count: "exact" }).eq("organization_id", organizationId).eq("organization_vendor_id", relationshipId),
      db.from("documents").select("id", { count: "exact" }).eq("organization_id", organizationId).eq("organization_vendor_id", relationshipId),
      db.from("vendor_monitoring_configs").select("id", { count: "exact" }).eq("organization_id", organizationId).eq("organization_vendor_id", relationshipId),
    ]);

    const expenseAccounts = accountRes.count ?? 0;
    const expenses = expRes.count ?? 0;
    const contracts = conRes.count ?? 0;
    const invoices = invRes.count ?? 0;
    const documents = docRes.count ?? 0;

    const monitoring = monitoringRes.count ?? 0;
    const hasFinancials = expenseAccounts > 0 || expenses > 0 || contracts > 0 || invoices > 0 || documents > 0 || monitoring > 0;

    return NextResponse.json({
      relationshipId,
      vendorName,
      blocked: hasFinancials,
      blockReason: hasFinancials
        ? "This vendor has saved financial records or contracts in your workspace. You must End Relationship instead of removing it."
        : undefined,
      counts: [
        { key: "expense_accounts", label: "Expense Accounts", count: expenseAccounts },
        { key: "expenses", label: "Expenses", count: expenses },
        { key: "contracts", label: "Contracts", count: contracts },
        { key: "invoices", label: "Invoices", count: invoices },
        { key: "documents", label: "Documents", count: documents },
        { key: "monitoring_configurations", label: "Monitoring Configurations", count: monitoring },
      ],
      previewVersion: "v1",
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return apiError(error, "Failed to load deletion preview.");
  }
}
