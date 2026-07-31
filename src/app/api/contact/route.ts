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
    if (!name || !company || !message || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Complete every required field with a valid work email." }, { status: 400 });
    const { error } = await createServerSupabaseClient().from("contact_inquiries").insert({ name, email, company, locations, message });
    if (error) throw error;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch { return NextResponse.json({ error: "Your inquiry could not be saved. Please email hello@costivra.com." }, { status: 500 }); }
}
