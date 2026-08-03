import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cleanText } from "@/lib/portal/http";
import { getConfiguredEnv } from "@/lib/env/secrets";

function inquiryRateLimitKey(request: Request) {
  const clientAddress =
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    `unknown:${request.headers.get("user-agent") || "browser"}`;
  const secret = getConfiguredEnv("SUPABASE_SECRET_KEY") || getConfiguredEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret) throw new Error("HMAC secret not configured.");
  return createHmac("sha256", secret)
    .update(`public-contact:${clientAddress}`)
    .digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const name = cleanText(body.name, 120);
    const email = cleanText(body.email, 254).toLowerCase();
    const company = cleanText(body.company, 160);
    const locations = cleanText(body.locations, 80) || null;
    const message = cleanText(body.message, 2_000);
    const marketingConsent = body.marketingConsent === true || body.marketingConsent === "on";
    if (!name || !company || !message || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Complete every required field with a valid work email." }, { status: 400 });
    const db = createServerSupabaseClient();
    const { data: rateLimitAllowed, error: rateLimitError } = await db.rpc(
      "claim_public_inquiry_rate_limit",
      {
        p_key_hash: inquiryRateLimitKey(request),
        p_limit: 5,
        p_window_seconds: 3_600,
      },
    );
    if (rateLimitError) throw rateLimitError;
    if (!rateLimitAllowed)
      return NextResponse.json(
        { error: "Too many inquiries were submitted from this connection. Please try again later or email hello@costivra.ai." },
        { status: 429 },
      );
    const { data, error } = await db.rpc("create_contact_inquiry_lead", {
      p_name: name,
      p_email: email,
      p_company: company,
      p_locations: locations ?? "",
      p_message: message,
      p_marketing_consent: marketingConsent,
    }).single();
    if (error || !data) throw error ?? new Error("INQUIRY_LEAD_NOT_CREATED");
    const lead = (data as unknown) as {
      inquiry_id: string;
      organization_id: string;
      contact_id: string;
      created_new_lead: boolean;
    };
    const inquiry = {
      id: String(lead.inquiry_id),
      organizationId: String(lead.organization_id),
      contactId: String(lead.contact_id),
      name,
      email,
      company,
      locations,
      message,
      marketingConsent,
    };
    const { deliverContactInquiryEmails } = await import("@/lib/email/contact-inquiry");
    const delivery = await deliverContactInquiryEmails(db, inquiry);
    return NextResponse.json({
      ok: true,
      leadCreated: Boolean(lead.created_new_lead),
      receiptSent: delivery.receipt,
    }, { status: 201 });
  } catch { return NextResponse.json({ error: "Your inquiry could not be saved. Please email hello@costivra.ai." }, { status: 500 }); }
}
