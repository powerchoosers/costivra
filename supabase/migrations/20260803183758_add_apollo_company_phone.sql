-- Apollo's company phone is provider-sourced context. Keep it in the
-- internal-only snapshot rather than overwriting an operator-entered field.
alter table public.crm_account_enrichments
  add column if not exists phone text
    check (phone is null or char_length(phone) <= 80);

comment on column public.crm_account_enrichments.phone is
  'Apollo-reported corporate phone number, retained as provider snapshot data.';
