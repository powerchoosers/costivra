import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isCronAuthorized } from "@/lib/cron/auth";
import { decryptMailboxToken } from "@/lib/integrations/mailbox-token-crypto";
import { downloadMailboxAttachment, listMatchingMailboxMessages, refreshMailboxAccessToken, type MailboxProvider } from "@/lib/integrations/mailbox-sync";
import { ingestDocumentBuffer, DOCUMENT_MIME_TYPES } from "@/lib/documents/intake";
import { scanFileForMalware } from "@/lib/security/malware-scanner";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const db = createServerSupabaseClient();
  const { data: connections, error } = await db.from("mailbox_oauth_connections").select("id,organization_id,provider,access_token_ciphertext,refresh_token_ciphertext,sync_cursor").eq("status", "connected").order("last_synced_at", { ascending: true, nullsFirst: true }).limit(10);
  if (error) return NextResponse.json({ error: "Mailbox connections could not be loaded." }, { status: 500 });
  const results: Array<Record<string, unknown>> = [];
  for (const connection of connections ?? []) {
    try {
      const { data: rules } = await db.from("mailbox_vendor_rules").select("sender_domains,sender_addresses,subject_terms").eq("mailbox_connection_id", connection.id).eq("organization_id", connection.organization_id).eq("enabled", true);
      if (!rules?.length) continue;
      let accessToken = decryptMailboxToken(connection.access_token_ciphertext);
      let listed;
      try { listed = await listMatchingMailboxMessages({ provider: connection.provider as MailboxProvider, accessTokenCiphertext: connection.access_token_ciphertext, refreshTokenCiphertext: connection.refresh_token_ciphertext, rules, cursor: connection.sync_cursor }); } catch {
        const refreshed = await refreshMailboxAccessToken(connection.provider as MailboxProvider, decryptMailboxToken(connection.refresh_token_ciphertext));
        accessToken = refreshed.access_token;
        listed = await listMatchingMailboxMessages({ provider: connection.provider as MailboxProvider, accessTokenCiphertext: (await import("@/lib/integrations/mailbox-token-crypto")).encryptMailboxToken(accessToken), refreshTokenCiphertext: connection.refresh_token_ciphertext, rules, cursor: connection.sync_cursor });
        await db.from("mailbox_oauth_connections").update({ access_token_ciphertext: (await import("@/lib/integrations/mailbox-token-crypto")).encryptMailboxToken(accessToken), token_expires_at: new Date(Date.now() + Math.max(60, Number(refreshed.expires_in ?? 3600) - 60) * 1000).toISOString(), updated_at: new Date().toISOString() }).eq("id", connection.id);
      }
      let ingested = 0;
      for (const message of listed.messages) for (const attachment of message.attachments) {
        if (!DOCUMENT_MIME_TYPES.has(attachment.contentType) || attachment.size <= 0 || attachment.size > 20 * 1024 * 1024) continue;
        const buffer = await downloadMailboxAttachment({ provider: connection.provider as MailboxProvider, accessToken, messageId: message.providerMessageId, attachmentId: attachment.id, inlineData: attachment.inlineData });
        const scan = await scanFileForMalware({ buffer, filename: attachment.filename, mimeType: attachment.contentType });
        if (scan.status !== "clean") continue;
        await ingestDocumentBuffer({ db, organizationId: connection.organization_id, actorType: "service", actorId: null, filename: attachment.filename, mimeType: attachment.contentType, buffer, sourceType: "email_forwarding", auditAction: "document.received_by_authorized_mailbox", malwareScan: scan, requestId: `mailbox-sync:${connection.id}` });
        ingested++;
      }
      await db.from("mailbox_oauth_connections").update({ sync_cursor: listed.cursor, last_synced_at: new Date().toISOString(), last_error_code: null, last_error_at: null, updated_at: new Date().toISOString() }).eq("id", connection.id);
      results.push({ id: connection.id, matched: listed.messages.length, ingested });
    } catch (connectionError) {
      const code = connectionError instanceof Error ? connectionError.message.slice(0, 160) : "mailbox_sync_failed";
      await db.from("mailbox_oauth_connections").update({ status: /401|403|refresh/i.test(code) ? "reauthorization_required" : "error", last_error_code: code, last_error_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", connection.id);
      results.push({ id: connection.id, error: "sync_failed" });
    }
  }
  return NextResponse.json({ processed: results.length, results });
}
