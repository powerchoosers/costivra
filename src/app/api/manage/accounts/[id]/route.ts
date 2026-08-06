import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { cleanText, cleanUuid } from "@/lib/portal/http";
import { normalizeAccountWebsite } from "@/lib/integrations/apollo";

const stages = new Set([
  "lead",
  "onboarding",
  "active",
  "at_risk",
  "inactive",
  "closed",
]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db, userId } = await requireInternalOperator();
    const organizationId = cleanUuid((await params).id);
    if (!organizationId) {
      return NextResponse.json({ error: "Invalid account." }, { status: 400 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const expectedUpdatedAt = typeof body.expectedUpdatedAt === "string" ? body.expectedUpdatedAt : "";
    if (!expectedUpdatedAt || Number.isNaN(Date.parse(expectedUpdatedAt))) return NextResponse.json({ error: "A current record version is required." }, { status: 400 });

    const name = "name" in body ? cleanText(body.name, 120) || null : undefined;
    const legalName = "legalName" in body ? cleanText(body.legalName, 140) || null : undefined;
    const industry = "industry" in body ? cleanText(body.industry, 80) || null : undefined;
    const employeeCountRange = "employeeCountRange" in body ? cleanText(body.employeeCountRange, 50) || null : undefined;
    const annualRevenueRange = "annualRevenueRange" in body ? cleanText(body.annualRevenueRange, 50) || null : undefined;
    const timezone = "timezone" in body ? cleanText(body.timezone, 50) || null : undefined;
    const currency = "currency" in body ? cleanText(body.currency, 10) || null : undefined;

    const stage = cleanText(body.stage, 30);
    if (stage && !stages.has(stage)) {
      return NextResponse.json({ error: "Choose a valid account stage." }, { status: 400 });
    }

    const nextFollowUpAt = cleanText(body.nextFollowUpAt, 40) || null;
    const phone = "phone" in body ? cleanText(body.phone, 80) || null : undefined;
    const websiteInput = cleanText(body.website, 2_048);
    const website = websiteInput ? normalizeAccountWebsite(websiteInput) : null;
    const assignedTo = "assignedTo" in body ? cleanUuid(body.assignedTo) || null : undefined;
    const primaryContactId = "primaryContactId" in body ? cleanUuid(body.primaryContactId) || null : undefined;
    const visibleInCrm = "visibleInCrm" in body ? Boolean(body.visibleInCrm) : undefined;

    const parentAccountId = "parentAccountId" in body ? cleanUuid(body.parentAccountId) || null : undefined;
    if (parentAccountId === organizationId) {
      return NextResponse.json({ error: "An account cannot be its own parent." }, { status: 400 });
    }

    if (parentAccountId) {
      const parent = await db.from("organizations").select("id").eq("id", parentAccountId).maybeSingle();
      if (parent.error) throw parent.error;
      if (!parent.data) {
        return NextResponse.json({ error: "Choose an existing parent account." }, { status: 400 });
      }
    }

    if (nextFollowUpAt && Number.isNaN(Date.parse(nextFollowUpAt))) {
      return NextResponse.json({ error: "Choose a valid follow-up date." }, { status: 400 });
    }

    if ("website" in body && websiteInput && !website) {
      return NextResponse.json({ error: "Enter a public http or https account website." }, { status: 400 });
    }

    const { data: updatedAt, error: mutationError } = await db.rpc("manage_update_account_record", {
      p_organization_id: organizationId, p_actor_id: userId, p_expected_updated_at: expectedUpdatedAt,
      p_updates: { ...(name !== undefined ? { name } : {}), ...(legalName !== undefined ? { legal_name: legalName } : {}), ...(industry !== undefined ? { industry } : {}), ...(employeeCountRange !== undefined ? { employee_count_range: employeeCountRange } : {}), ...(annualRevenueRange !== undefined ? { annual_revenue_range: annualRevenueRange } : {}), ...(timezone !== undefined ? { timezone } : {}), ...(currency !== undefined ? { currency } : {}), ...(parentAccountId !== undefined ? { parent_organization_id: parentAccountId } : {}), ...(primaryContactId !== undefined ? { primary_contact_id: primaryContactId } : {}), ...(phone !== undefined ? { phone } : {}), ...("stage" in body ? { lifecycle_stage: stage || "onboarding" } : {}), ...(assignedTo !== undefined ? { assigned_to: assignedTo } : {}), ...("nextFollowUpAt" in body ? { next_follow_up_at: nextFollowUpAt } : {}), ...("nextStep" in body ? { next_step: cleanText(body.nextStep, 500) || null } : {}), ...("privateNotes" in body ? { private_notes: cleanText(body.privateNotes, 4000) || null } : {}), ...(visibleInCrm !== undefined ? { visible_in_crm: visibleInCrm } : {}), ...("website" in body ? { website } : {}) },
    });
    if (mutationError) {
      if (mutationError.message.includes("RECORD_CONFLICT")) return NextResponse.json({ error: "This record changed in another session. Reload the latest version before saving.", code: "record_conflict" }, { status: 409 });
      if (mutationError.message.includes("INVALID_PARENT") || mutationError.message.includes("INVALID_PRIMARY_CONTACT")) return NextResponse.json({ error: "The selected relationship is no longer valid. Reload and try again." }, { status: 400 });
      throw mutationError;
    }
    return NextResponse.json({ ok: true, updatedAt });

    // 1. Update organizations table if org-level fields supplied
    if (
      name !== undefined ||
      legalName !== undefined ||
      parentAccountId !== undefined ||
      industry !== undefined ||
      employeeCountRange !== undefined ||
      annualRevenueRange !== undefined ||
      timezone !== undefined ||
      currency !== undefined
    ) {
      const orgUpdate: Record<string, unknown> = {
        ...(name !== undefined ? { name } : {}),
        ...(legalName !== undefined ? { legal_name: legalName } : {}),
        ...(parentAccountId !== undefined ? { parent_organization_id: parentAccountId } : {}),
        ...(industry !== undefined ? { industry } : {}),
        ...(employeeCountRange !== undefined ? { employee_count_range: employeeCountRange } : {}),
        ...(annualRevenueRange !== undefined ? { annual_revenue_range: annualRevenueRange } : {}),
        ...(timezone !== undefined ? { timezone } : {}),
        ...(currency !== undefined ? { currency } : {}),
        updated_at: new Date().toISOString(),
      };
      const { error: orgErr } = await db.from("organizations").update(orgUpdate).eq("id", organizationId);
      if (orgErr) throw orgErr;
    }

    // 2. Transactionally update primary contact if primaryContactId supplied
    if (primaryContactId !== undefined) {
      if (primaryContactId) {
        // Verify contact belongs to account
        const { data: contact } = await db
          .from("crm_contacts")
          .select("id, organization_id")
          .eq("id", primaryContactId)
          .eq("organization_id", organizationId)
          .maybeSingle();

        if (!contact) {
          return NextResponse.json({ error: "Selected primary contact does not belong to this account." }, { status: 400 });
        }

        // Clear previous primary
        await db.from("crm_contacts").update({ is_primary: false }).eq("organization_id", organizationId);
        // Set new primary
        await db.from("crm_contacts").update({ is_primary: true }).eq("id", primaryContactId);
      } else {
        // Clear all primary contacts for this org
        await db.from("crm_contacts").update({ is_primary: false }).eq("organization_id", organizationId);
      }
    }

    // 3. Upsert crm_account_profiles table
    const profileRecord = {
      organization_id: organizationId,
      ...("stage" in body ? { lifecycle_stage: stage || "onboarding" } : {}),
      ...(assignedTo !== undefined ? { assigned_to: assignedTo } : {}),
      ...(visibleInCrm !== undefined ? { visible_in_crm: visibleInCrm } : {}),
      ...("nextFollowUpAt" in body ? { next_follow_up_at: nextFollowUpAt } : {}),
      ...("nextStep" in body ? { next_step: cleanText(body.nextStep, 500) || null } : {}),
      ...("privateNotes" in body ? { private_notes: cleanText(body.privateNotes, 4_000) || null } : {}),
      ...("website" in body ? { website } : {}),
      updated_at: new Date().toISOString(),
    };

    const { error: profileError } = await db
      .from("crm_account_profiles")
      .upsert(profileRecord, { onConflict: "organization_id" });

    if (profileError) throw profileError;

    // 4. Log internal audit event and activity
    await db.from("crm_activities").insert({
      organization_id: organizationId,
      actor_id: userId,
      kind: "status_change",
      direction: "internal",
      subject: "Account details updated",
      summary: stage ? `Lifecycle stage: ${stage}` : null,
    });

    await db.from("internal_audit_events").insert({
      actor_id: userId,
      organization_id: organizationId,
      action: "crm.account_updated",
      resource_type: "organization",
      resource_id: organizationId,
      safe_metadata: {
        stage: "stage" in body ? stage || "onboarding" : null,
        name_changed: name !== undefined,
        industry_changed: industry !== undefined,
        primary_contact_changed: primaryContactId !== undefined,
        visible_in_crm: visibleInCrm,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { requireInternalOwner } = await import("@/lib/manage/auth");
    const { db, userId } = await requireInternalOwner();
    const organizationId = cleanUuid((await params).id);
    if (!organizationId) {
      return NextResponse.json({ error: "Invalid account ID." }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const reason = cleanText(body.reason, 200);
    const confirmation = cleanText(body.confirmation, 80);
    if (!reason || confirmation !== "DELETE") return NextResponse.json({ error: "Provide a reason and type DELETE to permanently remove an account." }, { status: 400 });

    const { error: deleteErr } = await db.rpc("manage_delete_empty_account", { p_organization_id: organizationId, p_actor_id: userId, p_reason: reason });
    if (deleteErr?.message.includes("DEPENDENCIES_PRESENT")) return NextResponse.json({ error: "Account dependency state changed or it has protected history. Reload the deletion preview and archive the account instead.", blocked: true }, { status: 409 });
    if (deleteErr) throw deleteErr;

    return NextResponse.json({ ok: true });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
