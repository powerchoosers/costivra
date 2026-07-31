import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { cleanText } from "@/lib/portal/http";

const stages = new Set([
  "lead",
  "onboarding",
  "active",
  "at_risk",
  "inactive",
  "closed",
]);

export async function POST(request: Request) {
  try {
    const { db, userId } = await requireInternalOperator();
    const body = (await request.json()) as Record<string, unknown>;
    const name = cleanText(body.name, 160);
    const legalName = cleanText(body.legalName, 200) || null;
    const industry = cleanText(body.industry, 120) || null;
    const stage = cleanText(body.stage, 30) || "lead";
    const contactName = cleanText(body.contactName, 160);
    const contactEmail = cleanText(body.contactEmail, 254).toLowerCase();
    if (!name || !stages.has(stage))
      return NextResponse.json(
        { error: "Enter an account name and valid stage." },
        { status: 400 },
      );
    if (contactEmail && !/^\S+@\S+\.\S+$/.test(contactEmail))
      return NextResponse.json(
        { error: "Enter a valid contact email." },
        { status: 400 },
      );

    const { data: organization, error: organizationError } = await db
      .from("organizations")
      .insert({
        name,
        legal_name: legalName,
        industry,
        primary_contact_name: contactName || null,
      })
      .select("id")
      .single();
    if (organizationError) throw organizationError;
    try {
      const { error: profileError } = await db
        .from("crm_account_profiles")
        .insert({ organization_id: organization.id, lifecycle_stage: stage });
      if (profileError) throw profileError;
      if (contactName && contactEmail) {
        const { error: contactError } = await db
          .from("crm_contacts")
          .insert({
            organization_id: organization.id,
            full_name: contactName,
            email: contactEmail,
            is_primary: true,
          });
        if (contactError) throw contactError;
      }
      await db
        .from("crm_activities")
        .insert({
          organization_id: organization.id,
          actor_id: userId,
          kind: "account_created",
          direction: "internal",
          subject: "Account added to CRM",
        });
      await db
        .from("internal_audit_events")
        .insert({
          actor_id: userId,
          organization_id: organization.id,
          action: "crm.account_created",
          resource_type: "organization",
          resource_id: organization.id,
        });
      return NextResponse.json(
        { ok: true, id: organization.id },
        { status: 201 },
      );
    } catch (error) {
      await db.from("organizations").delete().eq("id", organization.id);
      throw error;
    }
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }
}
