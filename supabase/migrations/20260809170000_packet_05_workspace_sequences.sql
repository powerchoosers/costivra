-- Packet 05: sequences are workspace-level campaigns. Each enrollment keeps
-- the contact's organization_id so account boundaries remain explicit.
alter table public.crm_sequences
  alter column organization_id drop not null;

comment on column public.crm_sequences.organization_id is
  'Optional legacy account scope. New internal sequences are workspace-level and enroll contacts from multiple organizations; each enrollment stores the contact organization.';
