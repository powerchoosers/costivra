create index if not exists crm_activity_mentions_actor_created_idx
  on public.crm_activity_mentions (mentioned_by, created_at desc)
  where mentioned_by is not null;
