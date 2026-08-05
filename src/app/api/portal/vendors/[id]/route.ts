import { NextResponse } from "next/server";
import { requirePortalContext, requirePortalEditor } from "@/lib/portal/repository";
import { apiError, cleanUuid, cleanText } from "@/lib/portal/http";

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

    const displayNameOverride = body.displayNameOverride !== undefined ? cleanText(body.displayNameOverride) : undefined;
    const categoryOverride = body.categoryOverride !== undefined ? cleanText(body.categoryOverride) : undefined;
    const websiteOverride = body.websiteOverride !== undefined ? cleanText(body.websiteOverride) : undefined;
    const relationshipStatus = body.relationshipStatus !== undefined ? cleanText(body.relationshipStatus) : undefined;
    const annualizedSpend = body.annualizedSpend !== undefined ? Number(body.annualizedSpend) : undefined;
    const spendCadence = body.spendCadence !== undefined ? cleanText(body.spendCadence) : undefined;

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (displayNameOverride !== undefined) updates.display_name_override = displayNameOverride || null;
    if (categoryOverride !== undefined) updates.category_override = categoryOverride || null;
    if (websiteOverride !== undefined) updates.website_override = websiteOverride || null;
    if (relationshipStatus !== undefined) {
      updates.relationship_status = relationshipStatus;
      if (relationshipStatus === "ended") {
        updates.ended_at = new Date().toISOString();
        updates.ended_by = userId;
      } else {
        updates.ended_at = null;
        updates.ended_by = null;
      }
    }
    if (annualizedSpend !== undefined && !isNaN(annualizedSpend)) updates.annualized_spend = annualizedSpend;
    if (spendCadence !== undefined) updates.spend_cadence = spendCadence;

    const { data, error } = await db
      .from("organization_vendors")
      .update(updates)
      .eq("id", relationshipId)
      .eq("organization_id", organizationId)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Vendor relationship not found." }, { status: 404 });
    }

    await db.from("audit_events").insert({
      actor_id: userId,
      organization_id: organizationId,
      action: "vendor_relationship.updated",
      resource_type: "vendor_relationship",
      resource_id: relationshipId,
      safe_metadata: { updates },
    });

    return NextResponse.json({ ok: true, relationship: data });
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
      db.from("expenses").select("id", { count: "exact" }).eq("organization_id", organizationId).eq("vendor_id", rel.vendor_id),
      db.from("contracts").select("id", { count: "exact" }).eq("organization_id", organizationId).eq("vendor_id", rel.vendor_id),
      db.from("invoices").select("id", { count: "exact" }).eq("organization_id", organizationId).eq("vendor_id", rel.vendor_id),
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
