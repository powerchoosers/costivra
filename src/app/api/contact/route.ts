import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cleanText } from "@/lib/portal/http";

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
