import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/portal/http";
import { decryptMailboxToken, exchangeMailboxCode, hashOAuthState, mailboxIdentity, type MailboxProvider } from "@/lib/integrations/mailbox-oauth";

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  try {
    const provider = (await params).provider as MailboxProvider;
    if (provider !== "google_gmail" && provider !== "microsoft_graph") return NextResponse.json({ error: "Unsupported mailbox provider." }, { status: 400 });
    const query = new URL(request.url).searchParams;
    const state = query.get("state");
    const code = query.get("code");
    if (!state || !code || query.get("error")) return NextResponse.json({ error: "Mailbox authorization was cancelled or denied." }, { status: 400 });
    const db = createServerSupabaseClient();
    const { data: oauthState } = await db.from("mailbox_oauth_states").select("id,organization_id,user_id,provider,code_verifier_ciphertext,redirect_uri,expires_at,used_at").eq("state_hash", hashOAuthState(state)).eq("provider", provider).is("used_at", null).maybeSingle();
    if (!oauthState || new Date(oauthState.expires_at).getTime() < Date.now()) return NextResponse.json({ error: "Mailbox authorization expired. Please try again." }, { status: 400 });
    const verifier = decryptMailboxToken(oauthState.code_verifier_ciphertext);
    const tokens = await exchangeMailboxCode(provider, code, verifier, oauthState.redirect_uri);
    if (!tokens.access_token || !tokens.refresh_token) throw new Error("Mailbox provider did not grant a refresh token; reconnect and approve offline access.");
    const identity = await mailboxIdentity(provider, tokens.access_token);
    const expiresAt = new Date(Date.now() + Math.max(60, Number(tokens.expires_in ?? 3600) - 60) * 1000).toISOString();
    const { error } = await db.from("mailbox_oauth_connections").upsert({ organization_id: oauthState.organization_id, connected_by: oauthState.user_id, provider, provider_account_id: identity.id, provider_email: identity.email, access_token_ciphertext: (await import("@/lib/integrations/mailbox-token-crypto")).encryptMailboxToken(tokens.access_token), refresh_token_ciphertext: (await import("@/lib/integrations/mailbox-token-crypto")).encryptMailboxToken(tokens.refresh_token), token_expires_at: expiresAt, granted_scopes: (tokens.scope ?? "").split(" ").filter(Boolean), status: "connected", disconnected_at: null, last_error_code: null, last_error_at: null, updated_at: new Date().toISOString() }, { onConflict: "organization_id,provider,provider_account_id" });
    if (error) throw new Error(`Could not save mailbox connection: ${error.message}`);
    await db.from("mailbox_oauth_states").update({ used_at: new Date().toISOString() }).eq("id", oauthState.id);
    await db.from("audit_events").insert({ organization_id: oauthState.organization_id, actor_type: "user", actor_id: oauthState.user_id, action: "mailbox.connected", resource_type: "mailbox_oauth_connection", metadata: { provider, providerEmail: identity.email } });
    const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(request.url).origin;
    return NextResponse.redirect(`${origin}/app/settings?tab=integrations&mailbox=connected`);
  } catch (error) { return apiError(error); }
}
