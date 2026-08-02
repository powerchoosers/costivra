-- Browser sessions authenticate with Supabase and may read only rows permitted by
-- tenant-scoped RLS. Every customer mutation is routed through a Costivra server
-- endpoint using the server credential, so browser roles do not need broad table
-- ownership-style grants left by the original schema bootstrap.

revoke all privileges on all tables in schema public from anon, authenticated;
revoke all privileges on all sequences in schema public from anon, authenticated;

grant select on table
  public.action_plans,
  public.approval_policies,
  public.approvals,
  public.audit_events,
  public.chat_messages,
  public.chat_sessions,
  public.contracts,
  public.document_extraction_versions,
  public.documents,
  public.evidence_references,
  public.expense_accounts,
  public.expenses,
  public.external_side_effects,
  public.inbound_email_addresses,
  public.inbound_email_attachments,
  public.inbound_email_events,
  public.integrations,
  public.internal_notifications,
  public.invoice_field_corrections,
  public.invoice_line_items,
  public.invoices,
  public.locations,
  public.notifications,
  public.opportunities,
  public.opportunity_evidence,
  public.organization_memberships,
  public.organization_vendors,
  public.organizations,
  public.profiles,
  public.report_definitions,
  public.savings_outcomes,
  public.vendors
to authenticated;

-- Keep the existing self-profile RLS update path available without granting
-- access to identity, organization, or authorization columns.
grant update (full_name, avatar_path, job_title, phone, linkedin_url)
  on table public.profiles
  to authenticated;
