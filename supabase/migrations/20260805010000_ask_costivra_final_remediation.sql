-- =============================================================================
-- Migration: ask_costivra_final_remediation
-- Timestamp: 20260805010000
-- Applied: 2026-08-05 via Supabase MCP
-- Purpose:
--   1. Expand invoices.vendor_match_status constraint (catalog_exact, domain,
--      enriched_candidate now allowed in addition to prior values).
--   2. Add one-reply-per-user-message uniqueness on chat_messages.
--   3. Add covering indexes for new foreign keys (performance advisor).
--   4. Add normalized_name unique index on vendors (no collisions confirmed).
--   5. Revoke reserve_provider_request_slot from anon and authenticated;
--      restrict to service_role only.
--   6. Fix mutable search path on reserve_provider_request_slot and
--      update_vendor_monitoring_configs_updated_at.
--   7. Recreate chat_message_documents RLS using (select auth.uid()) to
--      eliminate per-row auth.uid() evaluation.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Expand invoice vendor_match_status constraint
-- ---------------------------------------------------------------------------
alter table public.invoices
  drop constraint if exists invoices_vendor_match_status_check;

alter table public.invoices
  add constraint invoices_vendor_match_status_check
  check (
    vendor_match_status in (
      'provided',
      'exact',
      'catalog_exact',
      'domain',
      'enriched_candidate',
      'ambiguous',
      'unmatched'
    )
  );

-- ---------------------------------------------------------------------------
-- 2. One assistant reply per user message
-- ---------------------------------------------------------------------------
create unique index if not exists chat_messages_one_reply_per_message_idx
  on public.chat_messages (reply_to_message_id)
  where reply_to_message_id is not null;

-- ---------------------------------------------------------------------------
-- 3. Covering indexes for foreign keys
-- ---------------------------------------------------------------------------
create index if not exists chat_message_documents_document_idx
  on public.chat_message_documents (document_id);

create index if not exists chat_messages_reply_to_message_idx
  on public.chat_messages (reply_to_message_id)
  where reply_to_message_id is not null;

create index if not exists invoices_expense_category_idx
  on public.invoices (expense_category_id)
  where expense_category_id is not null;

create index if not exists vendors_category_idx
  on public.vendors (category_id)
  where category_id is not null;

create index if not exists vendor_categories_parent_idx
  on public.vendor_categories (parent_id)
  where parent_id is not null;

create index if not exists vendor_categories_merged_into_idx
  on public.vendor_categories (merged_into_id)
  where merged_into_id is not null;

create index if not exists vendor_enrichment_runs_candidate_vendor_idx
  on public.vendor_enrichment_runs (candidate_vendor_id)
  where candidate_vendor_id is not null;

create index if not exists vendor_enrichment_runs_candidate_category_idx
  on public.vendor_enrichment_runs (candidate_category_id)
  where candidate_category_id is not null;

-- ---------------------------------------------------------------------------
-- 4. Unique index on vendors.normalized_name (collisions confirmed absent)
-- ---------------------------------------------------------------------------
create unique index if not exists vendors_normalized_name_unique_idx
  on public.vendors (normalized_name)
  where normalized_name is not null
    and btrim(normalized_name) <> '';

-- ---------------------------------------------------------------------------
-- 5. Restrict reserve_provider_request_slot to service_role only
-- ---------------------------------------------------------------------------
revoke all on function public.reserve_provider_request_slot(text, integer, integer, integer)
  from public;

revoke execute on function public.reserve_provider_request_slot(text, integer, integer, integer)
  from anon;

revoke execute on function public.reserve_provider_request_slot(text, integer, integer, integer)
  from authenticated;

grant execute on function public.reserve_provider_request_slot(text, integer, integer, integer)
  to service_role;

-- ---------------------------------------------------------------------------
-- 6. Fix mutable search paths on SECURITY DEFINER functions
-- ---------------------------------------------------------------------------
alter function public.reserve_provider_request_slot(text, integer, integer, integer)
  set search_path = pg_catalog, public;

alter function public.update_vendor_monitoring_configs_updated_at()
  set search_path = pg_catalog, public;

-- ---------------------------------------------------------------------------
-- 7. Optimize chat_message_documents RLS
-- ---------------------------------------------------------------------------
drop policy if exists chat_message_documents_select_member
  on public.chat_message_documents;

create policy chat_message_documents_select_member
on public.chat_message_documents
for select
to authenticated
using (
  exists (
    select 1
    from public.chat_messages cm
    join public.chat_sessions cs on cs.id = cm.session_id
    join public.organization_memberships om
      on om.organization_id = cs.organization_id
    where cm.id = chat_message_documents.message_id
      and om.user_id = (select auth.uid())
      and cs.user_id = (select auth.uid())
  )
);
