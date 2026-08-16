-- Packet 06: provider delivery webhooks must be able to record the full
-- Resend lifecycle. The original ledger constraint only covered the
-- pre-provider states and made bounced/complained/suppressed updates fail.
alter table public.external_side_effects
  drop constraint if exists external_side_effects_status_check;

alter table public.external_side_effects
  add constraint external_side_effects_status_check
  check (status in (
    'pending', 'approved', 'scheduled', 'sent', 'delayed', 'delivered',
    'failed', 'bounced', 'complained', 'suppressed', 'cancelled'
  ));

comment on constraint external_side_effects_status_check on public.external_side_effects is
  'Allows lifecycle and report side effects to reconcile provider acceptance, delivery, delay, and terminal failure states.';
