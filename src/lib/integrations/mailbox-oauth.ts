import { createHash, randomBytes } from "node:crypto";
import { encryptMailboxToken, decryptMailboxToken } from "@/lib/integrations/mailbox-token-crypto";

export type MailboxProvider = "google_gmail" | "microsoft_graph";

const configs = {
  google_gmail: {
    clientId: "GOOGLE_GMAIL_CLIENT_ID",
    clientSecret: "GOOGLE_GMAIL_CLIENT_SECRET",
    authorize: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    scopes: ["openid", "email", "profile", "https://www.googleapis.com/auth/gmail.readonly"],
  },
  microsoft_graph: {
    clientId: "MICROSOFT_GRAPH_CLIENT_ID",
    clientSecret: "MICROSOFT_GRAPH_CLIENT_SECRET",
    authorize: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    token: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scopes: ["openid", "email", "profile", "offline_access", "User.Read", "Mail.Read"],
  },
} as const;

export function mailboxProviderConfig(provider: MailboxProvider) {
  const config = configs[provider];
  const clientId = process.env[config.clientId]?.trim();
  const clientSecret = process.env[config.clientSecret]?.trim();
  if (!clientId || !clientSecret) throw new Error(`${config.clientId} and ${config.clientSecret} are required`);
  return { ...config, clientId, clientSecret };
}

export function callbackUri(request: Request, provider: MailboxProvider) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(request.url).origin;
  return `${origin}/api/portal/integrations/mailbox/${provider}/callback`;
}

export function createPkce() {
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function hashOAuthState(state: string) {
  return createHash("sha256").update(state).digest("hex");
}

export async function exchangeMailboxCode(provider: MailboxProvider, code: string, verifier: string, redirectUri: string) {
  const config = mailboxProviderConfig(provider);
  const response = await fetch(config.token, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, code, code_verifier: verifier, redirect_uri: redirectUri, grant_type: "authorization_code" }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Mailbox OAuth token exchange failed (${response.status})`);
  return await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; id_token?: string };
}

export async function mailboxIdentity(provider: MailboxProvider, accessToken: string) {
  const endpoint = provider === "google_gmail" ? "https://www.googleapis.com/oauth2/v3/userinfo" : "https://graph.microsoft.com/v1.0/me?$select=id,mail,userPrincipalName";
  const response = await fetch(endpoint, { headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!response.ok) throw new Error(`Mailbox identity lookup failed (${response.status})`);
  const body = await response.json() as Record<string, unknown>;
  const id = typeof body.sub === "string" ? body.sub : typeof body.id === "string" ? body.id : "";
  const email = typeof body.email === "string" ? body.email : typeof body.mail === "string" ? body.mail : typeof body.userPrincipalName === "string" ? body.userPrincipalName : "";
  if (!id || !email) throw new Error("Mailbox provider did not return an account identity");
  return { id, email };
}

export { decryptMailboxToken, encryptMailboxToken };
