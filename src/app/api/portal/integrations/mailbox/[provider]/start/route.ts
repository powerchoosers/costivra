import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requirePortalEditor } from "@/lib/portal/repository";
import { createPkce, hashOAuthState, mailboxProviderConfig, type MailboxProvider, callbackUri, encryptMailboxToken } from "@/lib/integrations/mailbox-oauth";
import { apiError } from "@/lib/portal/http";

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  try {
    const provider = (await params).provider as MailboxProvider;
    if (provider !== "google_gmail" && provider !== "microsoft_graph") return NextResponse.json({ error: "Unsupported mailbox provider." }, { status: 400 });
    const { db, organizationId, userId } = await requirePortalEditor();
    const config = mailboxProviderConfig(provider);
    const redirectUri = callbackUri(request, provider);
    const state = randomBytes(32).toString("base64url");
    const pkce = createPkce();
    await db.from("mailbox_oauth_states").insert({ organization_id: organizationId, user_id: userId, provider, state_hash: hashOAuthState(state), code_verifier_ciphertext: encryptMailboxToken(pkce.verifier), redirect_uri: redirectUri, expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() });
    const url = new URL(config.authorize);
    const authorizationParams: Record<string, string> = { client_id: config.clientId, redirect_uri: redirectUri, response_type: "code", scope: config.scopes.join(" "), state, code_challenge: pkce.challenge, code_challenge_method: "S256", prompt: provider === "google_gmail" ? "consent" : "select_account" };
    if (provider === "google_gmail") authorizationParams.access_type = "offline";
    url.search = new URLSearchParams(authorizationParams).toString();
    return NextResponse.redirect(url);
  } catch (error) { return apiError(error); }
}
