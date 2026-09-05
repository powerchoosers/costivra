import { NextResponse } from "next/server";
import { requireInternalOperator } from "@/lib/manage/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const operator = await requireInternalOperator();
    const organizationId = process.env.COSTIVRA_TWILIO_ORGANIZATION_ID?.trim();
    if (!organizationId) return NextResponse.json({ configured: false, status: "unconfigured" });
    const { data, error } = await operator.db
      .from("integrations")
      .select("status,last_synced_at,configuration")
      .eq("organization_id", organizationId)
      .eq("provider", "twilio_trusthub")
      .maybeSingle();
    if (error) throw error;
    const configuration = data?.configuration && typeof data.configuration === "object" ? data.configuration as Record<string, unknown> : {};
    return NextResponse.json({ configured: true, status: data?.status || "pending", lastUpdatedAt: data?.last_synced_at || null, lastEventAt: configuration.last_event_at || null });
  } catch {
    return NextResponse.json({ error: "Unable to read Trust Hub status." }, { status: 500 });
  }
}
