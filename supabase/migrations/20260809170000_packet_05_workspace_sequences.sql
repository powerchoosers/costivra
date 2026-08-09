-- Packet 05: sequences are workspace-level campaigns. Each enrollment keeps
-- the contact's organization_id so account boundaries remain explicit.
alter table public.crm_sequences
  alter column organization_id drop not null;

-- Existing drafts were created with the old account selector. Preserve their
-- enrollment records, but make the campaign itself workspace-level as well.
update public.crm_sequences
set organization_id = null
where organization_id is not null;

comment on column public.crm_sequences.organization_id is
  'Optional legacy account scope. New internal sequences are workspace-level and enroll contacts from multiple organizations; each enrollment stores the contact organization.';
