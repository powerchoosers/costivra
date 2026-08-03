-- Catalog records are roadmap visibility, not proof of authorization or sync.
-- Keep customer-facing descriptions aligned with the functionality that exists.

update public.integrations
set description = case provider
  when 'microsoft-365' then 'Use an approved Outlook forwarding rule today. Direct mailbox authorization is planned.'
  when 'gmail' then 'Use an approved Google Workspace forwarding rule today. Direct mailbox authorization is planned.'
  when 'quickbooks' then 'Direct accounting-ledger reconciliation is planned and is not connected yet.'
  when 'stripe' then 'Subscription and fee synchronization is planned and is not connected yet.'
  when 'ucep' then 'A consented expert-review handoff requires a reviewed workflow before activation.'
  else description
end,
status = case when status in ('connected', 'paused', 'error') then 'available' else status end,
last_synced_at = null,
updated_at = now()
where provider in ('microsoft-365', 'gmail', 'quickbooks', 'stripe', 'ucep');
