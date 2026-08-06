import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { cleanUuid } from "@/lib/portal/http";
import { locationInput } from "@/lib/portal/locations";

export async function POST(request: Request) {
  try {
    const { db, userId } = await requireInternalOperator();
    const body = (await request.json()) as Record<string, unknown>;
    const organizationId = cleanUuid(body.organizationId);
    const input = locationInput(body);

    if (!organizationId || !input) {
      return NextResponse.json(
        { error: "Choose an account and enter a location name." },
        { status: 400 },
      );
    }
    if (!input.address?.line1 || !input.address.city || !input.address.state || !input.address.postal_code) {
      return NextResponse.json(
        { error: "Enter the street address, city, state, and ZIP code." },
        { status: 400 },
      );
    }

    const [{ data: organization, error: organizationError }, { data: duplicate, error: duplicateError }] = await Promise.all([
      db.from("organizations").select("id").eq("id", organizationId).maybeSingle(),
      db.from("locations").select("id").eq("organization_id", organizationId).eq("name", input.name).maybeSingle(),
    ]);
    if (organizationError) throw organizationError;
    if (duplicateError) throw duplicateError;
    if (!organization) {
      return NextResponse.json({ error: "That account is not available." }, { status: 404 });
    }
    if (duplicate) {
      return NextResponse.json({ error: "A location with this name already exists." }, { status: 409 });
    }

    const { data: created, error: createError } = await db
      .from("locations")
      .insert({ organization_id: organizationId, ...input })
      .select("id")
      .single();
    if (createError) throw createError;

    const { error: auditError } = await db.from("internal_audit_events").insert({
      actor_id: userId,
      organization_id: organizationId,
      action: "crm.location_created",
      resource_type: "location",
      resource_id: created.id,
    });
    if (auditError) throw auditError;

    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
