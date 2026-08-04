-- Migration: 20260804150000_client_assistant_v2.sql
-- Description: Client Assistant V2 schema enhancements, chat attachments, global vendor/category discovery pipeline, and RLS policies.

-- 1. Chat Sessions Enhancements
ALTER TABLE public.chat_sessions
  ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Backfill last_message_at
UPDATE public.chat_sessions
SET last_message_at = updated_at
WHERE last_message_at IS NULL;

-- Index for personal chat history pagination
CREATE INDEX IF NOT EXISTS idx_chat_sessions_personal_history
  ON public.chat_sessions (organization_id, user_id, archived_at, pinned_at DESC NULLS LAST, last_message_at DESC NULLS LAST, id);

-- 2. Chat Messages Enhancements
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS client_request_id UUID NULL,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'complete',
  ADD COLUMN IF NOT EXISTS response_schema_version TEXT NULL,
  ADD COLUMN IF NOT EXISTS response_blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS model_identifier TEXT NULL,
  ADD COLUMN IF NOT EXISTS trace_id UUID NULL,
  ADD COLUMN IF NOT EXISTS error_code TEXT NULL,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ NULL;

-- Idempotency index for message turns
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_messages_client_request
  ON public.chat_messages (session_id, client_request_id)
  WHERE client_request_id IS NOT NULL;

-- 3. Chat Message Attachments
CREATE TABLE IF NOT EXISTS public.chat_message_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE RESTRICT,
  relationship_type TEXT NOT NULL DEFAULT 'attachment',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_chat_message_document UNIQUE (message_id, document_id, relationship_type)
);

ALTER TABLE public.chat_message_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY chat_message_documents_select_member ON public.chat_message_documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_messages cm
      JOIN public.chat_sessions cs ON cs.id = cm.session_id
      JOIN public.organization_memberships om ON om.organization_id = cs.organization_id
      WHERE cm.id = chat_message_documents.message_id
        AND om.user_id = auth.uid()
    )
  );

-- 4. Vendor Categories Taxonomy
CREATE TABLE IF NOT EXISTS public.vendor_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id UUID NULL REFERENCES public.vendor_categories(id),
  status TEXT NOT NULL DEFAULT 'verified',
  created_source TEXT NOT NULL DEFAULT 'seed',
  source_confidence NUMERIC NULL,
  merged_into_id UUID NULL REFERENCES public.vendor_categories(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ NULL
);

ALTER TABLE public.vendor_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY vendor_categories_read_authenticated ON public.vendor_categories
  FOR SELECT TO authenticated
  USING (status IN ('verified', 'candidate'));

-- 5. Vendor Domains
CREATE TABLE IF NOT EXISTS public.vendor_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  normalized_domain TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'verified',
  source TEXT NOT NULL DEFAULT 'seed',
  confidence NUMERIC NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ NULL,
  CONSTRAINT uq_vendor_domain UNIQUE (vendor_id, normalized_domain)
);

CREATE INDEX IF NOT EXISTS idx_vendor_domains_normalized ON public.vendor_domains (normalized_domain);

ALTER TABLE public.vendor_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY vendor_domains_read_authenticated ON public.vendor_domains
  FOR SELECT TO authenticated
  USING (status IN ('verified', 'candidate'));

-- 6. Vendor Catalog Extensions
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS normalized_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS category_id UUID NULL REFERENCES public.vendor_categories(id),
  ADD COLUMN IF NOT EXISTS catalog_status TEXT NOT NULL DEFAULT 'verified',
  ADD COLUMN IF NOT EXISTS created_source TEXT NOT NULL DEFAULT 'seed',
  ADD COLUMN IF NOT EXISTS source_confidence NUMERIC NULL,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS verified_by UUID NULL;

CREATE INDEX IF NOT EXISTS idx_vendors_normalized_name ON public.vendors (normalized_name);

-- 7. Vendor Enrichment Provenance Ledger (Server-only)
CREATE TABLE IF NOT EXISTS public.vendor_enrichment_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NULL,
  document_id UUID NULL,
  invoice_id UUID NULL,
  extracted_vendor_name TEXT NOT NULL,
  query_fingerprint TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'openrouter_search',
  status TEXT NOT NULL DEFAULT 'completed',
  candidate_vendor_id UUID NULL REFERENCES public.vendors(id),
  candidate_category_id UUID NULL REFERENCES public.vendor_categories(id),
  confidence NUMERIC NULL,
  public_evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  safe_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_code TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL
);

ALTER TABLE public.vendor_enrichment_runs ENABLE ROW LEVEL SECURITY;
-- Server-only access policy (no browser reads)
CREATE POLICY vendor_enrichment_runs_deny_all ON public.vendor_enrichment_runs
  FOR ALL TO authenticated USING (false);

-- 8. Invoices Resolution Fields
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS vendor_match_confidence NUMERIC NULL,
  ADD COLUMN IF NOT EXISTS vendor_resolution_method TEXT NULL,
  ADD COLUMN IF NOT EXISTS expense_category_id UUID NULL REFERENCES public.vendor_categories(id),
  ADD COLUMN IF NOT EXISTS category_confidence NUMERIC NULL,
  ADD COLUMN IF NOT EXISTS invoice_subtype TEXT NULL;
