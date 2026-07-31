create index if not exists inbound_email_addresses_created_by_idx
  on public.inbound_email_addresses (created_by)
  where created_by is not null;

create index if not exists inbound_email_events_intake_address_idx
  on public.inbound_email_events (intake_address_id);

create index if not exists inbound_email_attachments_organization_idx
  on public.inbound_email_attachments (organization_id);
