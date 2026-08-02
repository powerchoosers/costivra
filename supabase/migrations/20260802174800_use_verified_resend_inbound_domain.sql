-- Resend's current account verifies and receives mail for costivra.ai. Customer
-- intake addresses must use that same domain until a separate receiving-domain
-- slot is available for inbound.costivra.ai.

alter table public.inbound_email_addresses
  alter column domain set default 'costivra.ai';

update public.inbound_email_addresses
set domain = 'costivra.ai',
    updated_at = now()
where domain = 'inbound.costivra.ai';

create or replace function public.provision_inbound_email_intake()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  safe_slug text;
begin
  safe_slug := nullif(trim(both '-' from left(regexp_replace(lower(new.name), '[^a-z0-9]+', '-', 'g'), 48)), '');
  safe_slug := coalesce(safe_slug, 'workspace');

  insert into public.inbound_email_addresses (organization_id, local_part, domain)
  values (new.id, safe_slug || '-' || left(replace(new.id::text, '-', ''), 6), 'costivra.ai')
  on conflict (organization_id) do nothing;

  insert into public.integrations (organization_id, provider, display_name, description, status, configuration)
  values (
    new.id,
    'resend_inbound',
    'Email document intake',
    'Forward invoices and contracts to a private organization-specific address.',
    'available',
    '{}'::jsonb
  )
  on conflict (organization_id, provider) do nothing;

  return new;
end;
$$;

revoke all on function public.provision_inbound_email_intake() from public, anon, authenticated;
