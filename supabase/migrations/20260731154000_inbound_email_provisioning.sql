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
  values (new.id, safe_slug || '-' || left(replace(new.id::text, '-', ''), 6), 'inbound.costivra.ai')
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

drop trigger if exists organizations_provision_inbound_email_intake on public.organizations;
create trigger organizations_provision_inbound_email_intake
after insert on public.organizations
for each row execute function public.provision_inbound_email_intake();
