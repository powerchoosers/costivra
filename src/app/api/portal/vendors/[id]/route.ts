import { NextResponse } from "next/server";
import { requirePortalContext, requirePortalEditor } from "@/lib/portal/repository";
import { apiError, cleanUuid, cleanText } from "@/lib/portal/http";

const conflictMessage = "This record changed in another session. Reload the latest version before saving.";
const statuses = new Set(["prospect", "active", "inactive", "terminated"]);
const cadences = new Set(["monthly", "annual"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db, organizationId, userId } = await requirePortalEditor();
    const relationshipId = cleanUuid((await params).id);
    if (!relationshipId) {
      return NextResponse.json({ error: "Invalid vendor relationship ID." }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const expectedUpdatedAt = typeof body.expectedUpdatedAt === "string" ? body.expectedUpdatedAt : "";
    if (!expectedUpdatedAt || Number.isNaN(Date.parse(expectedUpdatedAt))) return NextResponse.json({ error: "A current record version is required." }, { status: 400 });
    const displayNameOverride = body.displayNameOverride !== undefined ? cleanText(body.displayNameOverride, 160) : undefined;
    const categoryOverride = body.categoryOverride !== undefined ? cleanText(body.categoryOverride, 100) : undefined;
    const websiteOverride = body.websiteOverride !== undefined ? cleanText(body.websiteOverride, 2048) : undefined;
    const relationshipStatus = body.relationshipStatus !== undefined ? cleanText(body.relationshipStatus) : undefined;
    const annualizedSpend = body.annualizedSpend !== undefined ? Number(body.annualizedSpend) : undefined;
    const spendCadence = body.spendCadence !== undefined ? cleanText(body.spendCadence) : undefined;

    if (relationshipStatus !== undefined && !statuses.has(relationshipStatus)) return NextResponse.json({ error: "Choose a valid vendor relationship status." }, { status: 400 });
    if (spendCadence !== undefined && !cadences.has(spendCadence)) return NextResponse.json({ error: "Choose a valid spend cadence." }, { status: 400 });
    if (annualizedSpend !== undefined && (!Number.isFinite(annualizedSpend) || annualizedSpend < 0)) return NextResponse.json({ error: "Annualized spend must be a non-negative number." }, { status: 400 });
    if (websiteOverride && !/^https?:\/\/[^\s/$.?#][^\s]*$/i.test(websiteOverride)) return NextResponse.json({ error: "Enter a public http or https vendor website." }, { status: 400 });

    const updates: Record<string, unknown> = {};

    if (displayNameOverride !== undefined) updates.display_name_override = displayNameOverride || null;
    if (categoryOverride !== undefined) updates.category_override = categoryOverride || null;
    if (websiteOverride !== undefined) updates.website_override = websiteOverride || null;
    if (relationshipStatus !== undefined) {
      updates.relationship_status = relationshipStatus;
    }
    if (annualizedSpend !== undefined && !isNaN(annualizedSpend)) updates.annualized_spend = annualizedSpend;
    if (spendCadence !== undefined) updates.spend_cadence = spendCadence;

    const { data, error } = await db.rpc("portal_update_vendor_relationship", {
      p_relationship_id: relationshipId, p_organization_id: organizationId, p_actor_id: userId,
      p_expected_updated_at: expectedUpdatedAt, p_updates: updates,
    });
    if (error) {
      if (error.message.includes("RECORD_CONFLICT")) return NextResponse.json({ error: conflictMessage, code: "record_conflict" }, { status: 409 });
      if (error.message.includes("RECORD_NOT_FOUND")) return NextResponse.json({ error: "Vendor relationship not found." }, { status: 404 });
      throw error;
    }
    return NextResponse.json({ ok: true, relationship: Array.isArray(data) ? data[0] : data });
  } catch (error) {
    return apiError(error, "Failed to update vendor relationship.");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db, organizationId, userId, role } = await requirePortalContext();
    if (role !== "owner" && role !== "admin") {
      return NextResponse.json(
        { error: "Only organization owners or admins can remove vendor relationships." },
        { status: 403 },
      );
    }

    const relationshipId = cleanUuid((await params).id);
    if (!relationshipId) {
      return NextResponse.json({ error: "Invalid vendor relationship ID." }, { status: 400 });
    }

    const { data: rel } = await db
      .from("organization_vendors")
      .select("id, vendor_id, vendors(canonical_name)")
      .eq("id", relationshipId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!rel) {
      return NextResponse.json({ error: "Vendor relationship not found." }, { status: 404 });
    }

    const [expensesRes, contractsRes, invoicesRes] = await Promise.all([
      db.from("expenses").select("id", { count: "exact" }).eq("organization_id", organizationId).eq("organization_vendor_id", relationshipId),
      db.from("contracts").select("id", { count: "exact" }).eq("organization_id", organizationId).eq("organization_vendor_id", relationshipId),
      db.from("invoices").select("id", { count: "exact" }).eq("organization_id", organizationId).eq("organization_vendor_id", relationshipId),
    ]);

    const expenseCount = expensesRes.count ?? 0;
    const contractCount = contractsRes.count ?? 0;
    const invoiceCount = invoicesRes.count ?? 0;

    if (expenseCount > 0 || contractCount > 0 || invoiceCount > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete vendor relationship with recorded financial transactions or contracts. End relationship instead.",
          counts: { expenses: expenseCount, contracts: contractCount, invoices: invoiceCount },
        },
        { status: 409 },
      );
    }

    const { error: deleteErr } = await db
      .from("organization_vendors")
      .delete()
      .eq("id", relationshipId)
      .eq("organization_id", organizationId);

    if (deleteErr) throw deleteErr;

    await db.from("audit_events").insert({
      actor_id: userId,
      organization_id: organizationId,
      action: "vendor_relationship.deleted",
      resource_type: "vendor_relationship",
      resource_id: relationshipId,
      safe_metadata: { vendor_id: rel.vendor_id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "Failed to delete vendor relationship.");
  }
}
