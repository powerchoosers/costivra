-- Keep the deterministic per-sequence send cap query bounded as mail history grows.
create index if not exists crm_email_messages_sequence_daily_cap_idx
  on public.crm_email_messages (sequence_id, created_at desc)
  where origin = 'sequence' and provider_message_id is not null;
