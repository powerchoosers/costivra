import { decryptMailboxToken, encryptMailboxToken, type MailboxProvider } from "@/lib/integrations/mailbox-oauth";
export type { MailboxProvider } from "@/lib/integrations/mailbox-oauth";

export type MailboxRule = { sender_domains: string[]; sender_addresses: string[]; subject_terms: string[] };
export type MailboxAttachment = { id: string; filename: string; contentType: string; size: number; inlineData?: string };
export type MailboxMessage = { providerMessageId: string; sender: string; subject: string; receivedAt: string; attachments: MailboxAttachment[] };

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

function messageMatchesRules(message: Pick<MailboxMessage, "sender" | "subject">, rules: MailboxRule[]) {
  return rules.some((rule) => matches(rule, message.sender, message.subject));
}

function gmailHeader(payload: Record<string, unknown>, name: string) {
  const headers = Array.isArray(payload.headers) ? payload.headers as Array<Record<string, unknown>> : [];
  return String(headers.find((header) => String(header.name).toLowerCase() === name.toLowerCase())?.value ?? "");
}

export function extractGmailAttachments(payload: Record<string, unknown>): MailboxAttachment[] {
  const attachments: MailboxAttachment[] = [];

  function visit(part: Record<string, unknown>) {
    const body = part.body && typeof part.body === "object" ? part.body as Record<string, unknown> : {};
    const filename = typeof part.filename === "string" ? part.filename.trim() : "";
    const attachmentId = typeof body.attachmentId === "string" ? body.attachmentId : "";
    const inlineData = typeof body.data === "string" ? body.data : undefined;
    if (filename && (attachmentId || inlineData)) {
      attachments.push({
        id: attachmentId || `inline:${String(part.partId ?? filename)}`,
        filename,
        contentType: String(part.mimeType ?? "application/octet-stream"),
        size: Number(body.size ?? 0),
        ...(inlineData ? { inlineData } : {}),
      });
    }
    for (const child of Array.isArray(part.parts) ? part.parts : []) {
      if (child && typeof child === "object") visit(child as Record<string, unknown>);
    }
  }

  visit(payload);
  return attachments;
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
  const accessToken = decryptMailboxToken(input.accessTokenCiphertext);
  if (input.provider === "google_gmail") {
    // Advance to the instant this scan began. A message arriving during the scan
    // will still be included by the next `after:` query instead of falling into a gap.
    const nextCursor = Math.floor(Date.now() / 1000).toString();
    const query = input.cursor ? `after:${input.cursor}` : "newer_than:7d";
    const list = await providerFetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=${encodeURIComponent(`${query} has:attachment`)}`, accessToken);
    const ids = Array.isArray(list.messages) ? list.messages.flatMap((item) => item && typeof item === "object" && typeof (item as Record<string, unknown>).id === "string" ? [(item as Record<string, unknown>).id as string] : []) : [];
    const messages: MailboxMessage[] = [];
    for (const id of ids) {
      const metadata = await providerFetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, accessToken);
      const metadataPayload = (metadata.payload ?? {}) as Record<string, unknown>;
      const from = gmailHeader(metadataPayload, "from");
      const candidate = {
        providerMessageId: id,
        sender: from.match(/<([^>]+)>/)?.[1] ?? from,
        subject: gmailHeader(metadataPayload, "subject"),
        receivedAt: gmailHeader(metadataPayload, "date") || (typeof metadata.internalDate === "string" ? new Date(Number(metadata.internalDate)).toISOString() : new Date().toISOString()),
      };
      if (!messageMatchesRules(candidate, input.rules)) continue;

      // Gmail's metadata format intentionally omits MIME bodies. Fetch the full
      // payload only after the approved sender/subject rule matches.
      const full = await providerFetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`, accessToken);
      const attachments = extractGmailAttachments((full.payload ?? {}) as Record<string, unknown>);
      if (attachments.length > 0) messages.push({ ...candidate, attachments });
    }
    return { messages, cursor: nextCursor };
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

export async function downloadMailboxAttachment(input: { provider: MailboxProvider; accessToken: string; messageId: string; attachmentId: string; inlineData?: string }) {
  if (input.provider === "google_gmail") {
    if (input.inlineData) {
      return Buffer.from(input.inlineData.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    }
    const body = await providerFetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(input.messageId)}/attachments/${encodeURIComponent(input.attachmentId)}`, input.accessToken);
    const encoded = typeof body.data === "string" ? body.data.replace(/-/g, "+").replace(/_/g, "/") : "";
    return Buffer.from(encoded, "base64");
  }
  const body = await providerFetch(`https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(input.messageId)}/attachments/${encodeURIComponent(input.attachmentId)}`, input.accessToken);
  const encoded = typeof body.contentBytes === "string" ? body.contentBytes : "";
  return Buffer.from(encoded, "base64");
}

export { encryptMailboxToken };
