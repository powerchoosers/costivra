import { decryptMailboxToken, encryptMailboxToken, type MailboxProvider } from "@/lib/integrations/mailbox-oauth";

export type MailboxRule = { sender_domains: string[]; sender_addresses: string[]; subject_terms: string[] };
export type MailboxMessage = { providerMessageId: string; sender: string; subject: string; receivedAt: string; attachments: Array<{ id: string; filename: string; contentType: string; size: number }> };

function matches(rule: MailboxRule, sender: string, subject: string) {
  const normalizedSender = sender.trim().toLowerCase();
  const domain = normalizedSender.split("@")[1] ?? "";
  const senderMatch = rule.sender_addresses.some((value) => value === normalizedSender) || rule.sender_domains.some((value) => domain === value || domain.endsWith(`.${value}`));
  const subjectMatch = rule.subject_terms.some((value) => subject.toLowerCase().includes(value.toLowerCase()));
  return senderMatch || subjectMatch;
}

export function filterMatchingMessages(messages: MailboxMessage[], rules: MailboxRule[]) {
  return messages.filter((message) => rules.some((rule) => matches(rule, message.sender, message.subject)) && message.attachments.length > 0);
}

async function providerFetch(url: string, accessToken: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, headers: { authorization: `Bearer ${accessToken}`, ...(init?.headers ?? {}) }, cache: "no-store" });
  if (!response.ok) throw new Error(`Mailbox provider request failed (${response.status})`);
  return response.json() as Promise<Record<string, unknown>>;
}

export async function refreshMailboxAccessToken(provider: MailboxProvider, refreshToken: string) {
  const endpoint = provider === "google_gmail" ? "https://oauth2.googleapis.com/token" : "https://login.microsoftonline.com/common/oauth2/v2.0/token";
  const clientId = process.env[provider === "google_gmail" ? "GOOGLE_GMAIL_CLIENT_ID" : "MICROSOFT_GRAPH_CLIENT_ID"]?.trim();
  const clientSecret = process.env[provider === "google_gmail" ? "GOOGLE_GMAIL_CLIENT_SECRET" : "MICROSOFT_GRAPH_CLIENT_SECRET"]?.trim();
  if (!clientId || !clientSecret) throw new Error("Mailbox OAuth client credentials are not configured");
  const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token", scope: provider === "microsoft_graph" ? "https://graph.microsoft.com/Mail.Read offline_access" : "https://www.googleapis.com/auth/gmail.readonly" }), cache: "no-store" });
  if (!response.ok) throw new Error(`Mailbox token refresh failed (${response.status})`);
  return await response.json() as { access_token: string; expires_in?: number };
}

export async function listMatchingMailboxMessages(input: { provider: MailboxProvider; accessTokenCiphertext: string; refreshTokenCiphertext: string; rules: MailboxRule[]; cursor?: string | null }) {
  let accessToken = decryptMailboxToken(input.accessTokenCiphertext);
  if (input.provider === "google_gmail") {
    const query = input.cursor ? `after:${input.cursor}` : "newer_than:7d";
    const list = await providerFetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=${encodeURIComponent(`${query} has:attachment`)}`, accessToken);
    const ids = Array.isArray(list.messages) ? list.messages.flatMap((item) => item && typeof item === "object" && typeof (item as Record<string, unknown>).id === "string" ? [(item as Record<string, unknown>).id as string] : []) : [];
    const messages: MailboxMessage[] = [];
    for (const id of ids) {
      const message = await providerFetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, accessToken);
      const payload = (message.payload ?? {}) as Record<string, unknown>;
      const headers = Array.isArray(payload.headers) ? payload.headers as Array<Record<string, unknown>> : [];
      const value = (name: string) => String(headers.find((header) => String(header.name).toLowerCase() === name.toLowerCase())?.value ?? "");
      const parts = Array.isArray(payload.parts) ? payload.parts as Array<Record<string, unknown>> : [];
      const attachments = parts.flatMap((part) => typeof part.filename === "string" && part.filename && typeof part.body === "object" && part.body ? [{ id: String((part.body as Record<string, unknown>).attachmentId ?? ""), filename: part.filename, contentType: String(part.mimeType ?? "application/octet-stream"), size: Number((part.body as Record<string, unknown>).size ?? 0) }] : []).filter((part) => part.id);
      messages.push({ providerMessageId: id, sender: value("from").match(/<([^>]+)>/)?.[1] ?? value("from"), subject: value("subject"), receivedAt: value("date") || new Date().toISOString(), attachments });
    }
    return { messages: filterMatchingMessages(messages, input.rules), cursor: String(list.historyId ?? input.cursor ?? "") };
  }
  const url = input.cursor ? `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages/delta?$deltatoken=${encodeURIComponent(input.cursor)}&$select=id,from,subject,receivedDateTime,hasAttachments` : "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages/delta?$select=id,from,subject,receivedDateTime,hasAttachments";
  const list = await providerFetch(url, accessToken);
  const messages: MailboxMessage[] = [];
  for (const item of Array.isArray(list.value) ? list.value : []) {
    if (!item || typeof item !== "object" || !(item as Record<string, unknown>).hasAttachments) continue;
    const row = item as Record<string, unknown>;
    const sender = String((((row.from as Record<string, unknown> | undefined)?.emailAddress as Record<string, unknown> | undefined)?.address) ?? "");
    const attachmentsResponse = await providerFetch(`https://graph.microsoft.com/v1.0/me/messages/${row.id}/attachments?$select=id,name,contentType,size`, accessToken);
    const attachments = (Array.isArray(attachmentsResponse.value) ? attachmentsResponse.value : []).flatMap((attachment) => attachment && typeof attachment === "object" ? [{ id: String((attachment as Record<string, unknown>).id ?? ""), filename: String((attachment as Record<string, unknown>).name ?? ""), contentType: String((attachment as Record<string, unknown>).contentType ?? "application/octet-stream"), size: Number((attachment as Record<string, unknown>).size ?? 0) }] : []).filter((attachment) => attachment.id && attachment.filename);
    messages.push({ providerMessageId: String(row.id), sender, subject: String(row.subject ?? ""), receivedAt: String(row.receivedDateTime ?? new Date().toISOString()), attachments });
  }
  return { messages: filterMatchingMessages(messages, input.rules), cursor: typeof list["@odata.deltaLink"] === "string" ? list["@odata.deltaLink"] : input.cursor ?? null };
}

export { encryptMailboxToken };
