import { createServerSupabaseClient } from "../src/lib/supabase/server";

async function main() {
  console.log("🔒 Costivra Document Scan Provenance & Integrity Audit");
  console.log("=====================================================");

  const db = createServerSupabaseClient();

  // Check documents table security scan status distribution
  const { data: documents, error: docError } = await db
    .from("documents")
    .select("id, status, security_scan_status, created_at");

  if (docError) {
    console.error("❌ Failed to query documents:", docError.message);
    process.exit(1);
  }

  const docCount = documents?.length ?? 0;
  console.log(`Auditing ${docCount} document records...`);

  const statusCounts: Record<string, number> = {};
  for (const doc of documents || []) {
    const status = String(doc.security_scan_status || "unrecorded");
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  }

  console.log("\nDocument Security Scan Status Distribution:");
  for (const [status, count] of Object.entries(statusCounts)) {
    console.log(`  - ${status}: ${count}`);
  }

  // Check document_security_scan_attempts ledger
  const { count: attemptCount, error: attemptError } = await db
    .from("document_security_scan_attempts")
    .select("*", { count: "exact", head: true });

  if (attemptError) {
    console.warn("⚠️ Could not count scan attempts:", attemptError.message);
  } else {
    console.log(`\nScan Attempts Recorded in Ledger: ${attemptCount ?? 0}`);
  }

  console.log("\n✅ Document security provenance audit complete.");
}

main().catch((err) => {
  console.error("❌ Audit failed:", err);
  process.exit(1);
});
