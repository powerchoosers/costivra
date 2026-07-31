-- Cover mailbox audit foreign keys so staff/profile updates do not require
-- sequential scans of the mailbox registry.
create index if not exists crm_mailboxes_created_by_idx
  on public.crm_mailboxes(created_by)
  where created_by is not null;

create index if not exists crm_mailboxes_updated_by_idx
  on public.crm_mailboxes(updated_by)
  where updated_by is not null;
