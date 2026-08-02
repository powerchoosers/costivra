import { randomBytes, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const runLive = process.env.RUN_LIVE_SUPABASE_TESTS === "1";
const suite = runLive ? describe : describe.skip;

type TenantFixture = {
  userId: string;
  organizationId: string;
  documentId: string;
  email: string;
  password: string;
};

function requiredEnvironmentVariable(name: string) {
  const value = process.env[name];
  if (!value || value === "Encrypted") {
    throw new Error(`${name} must contain a real value to run live Supabase tests.`);
  }
  return value;
}

async function createTenantFixture(
  admin: SupabaseClient,
  label: string,
): Promise<TenantFixture> {
  const nonce = randomUUID();
  const email = `costivra-tenant-test-${nonce}@example.invalid`;
  const password = `${randomBytes(24).toString("base64url")}Aa1!`;
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: `${label} isolation test`,
      company_name: `${label} ${nonce}`,
    },
  });
  if (createError || !created.user) {
    throw createError ?? new Error("The temporary tenant user was not created.");
  }

  const { data: membership, error: membershipError } = await admin
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", created.user.id)
    .single();
  if (membershipError || !membership) {
    await admin.auth.admin.deleteUser(created.user.id);
    throw membershipError ?? new Error("The temporary tenant membership was not created.");
  }

  const { data: document, error: documentError } = await admin
    .from("documents")
    .insert({
      organization_id: membership.organization_id,
      storage_path: `${membership.organization_id}/tenant-isolation/${nonce}.pdf`,
      original_filename: `${label.toLowerCase()}-invoice.pdf`,
      mime_type: "application/pdf",
      byte_size: 32,
      sha256: randomBytes(32).toString("hex"),
      status: "ready",
      uploaded_by: created.user.id,
      document_type: "invoice",
    })
    .select("id")
    .single();
  if (documentError || !document) {
    await admin.from("organizations").delete().eq("id", membership.organization_id);
    await admin.auth.admin.deleteUser(created.user.id);
    throw documentError ?? new Error("The temporary tenant document was not created.");
  }

  return {
    userId: created.user.id,
    organizationId: membership.organization_id,
    documentId: document.id,
    email,
    password,
  };
}

suite.sequential("live Supabase tenant isolation", () => {
  let admin: SupabaseClient;
  let publicUrl: string;
  let publishableKey: string;
  const fixtures: TenantFixture[] = [];

  beforeAll(async () => {
    publicUrl = requiredEnvironmentVariable("NEXT_PUBLIC_SUPABASE_URL");
    publishableKey = requiredEnvironmentVariable("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    admin = createClient(publicUrl, requiredEnvironmentVariable("SUPABASE_SECRET_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    fixtures.push(await createTenantFixture(admin, "Alpha"));
    fixtures.push(await createTenantFixture(admin, "Beta"));
  }, 30_000);

  afterAll(async () => {
    if (!admin) return;
    for (const fixture of fixtures) {
      await admin.from("organizations").delete().eq("id", fixture.organizationId);
      await admin.auth.admin.deleteUser(fixture.userId);
    }
  }, 30_000);

  it("allows each customer to read only its own organization and document", async () => {
    const [alpha, beta] = fixtures;
    for (const [own, foreign] of [[alpha, beta], [beta, alpha]] as const) {
      const client = createClient(publicUrl, publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error: signInError } = await client.auth.signInWithPassword({
        email: own.email,
        password: own.password,
      });
      expect(signInError).toBeNull();

      const { data: organizations, error: organizationsError } = await client
        .from("organizations")
        .select("id");
      expect(organizationsError).toBeNull();
      expect(organizations?.map((record) => record.id)).toEqual([own.organizationId]);

      const { data: ownDocument, error: ownDocumentError } = await client
        .from("documents")
        .select("id")
        .eq("id", own.documentId)
        .maybeSingle();
      expect(ownDocumentError).toBeNull();
      expect(ownDocument?.id).toBe(own.documentId);

      const { data: foreignDocument, error: foreignDocumentError } = await client
        .from("documents")
        .select("id")
        .eq("id", foreign.documentId)
        .maybeSingle();
      expect(foreignDocumentError).toBeNull();
      expect(foreignDocument).toBeNull();
    }
  }, 30_000);

  it("does not grant browser clients direct write access to another tenant", async () => {
    const [alpha, beta] = fixtures;
    const client = createClient(publicUrl, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: signInError } = await client.auth.signInWithPassword({
      email: alpha.email,
      password: alpha.password,
    });
    expect(signInError).toBeNull();

    const { error } = await client.from("documents").insert({
      organization_id: beta.organizationId,
      storage_path: `${beta.organizationId}/tenant-isolation/forbidden.pdf`,
      original_filename: "forbidden.pdf",
      mime_type: "application/pdf",
      byte_size: 1,
      sha256: randomBytes(32).toString("hex"),
      status: "ready",
    });
    expect(error).not.toBeNull();
  }, 30_000);
});
