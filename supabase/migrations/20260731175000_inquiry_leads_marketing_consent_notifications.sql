alter table public.contact_inquiries
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists contact_id uuid references public.crm_contacts(id) on delete set null,
  add column if not exists marketing_consent boolean not null default false,
  add column if not exists marketing_consent_at timestamptz,
  add column if not exists marketing_consent_version text,
  add column if not exists source_path text not null default '/contact';

alter table public.contact_inquiries
  drop constraint if exists contact_inquiries_marketing_consent_evidence_check;

alter table public.contact_inquiries
  add constraint contact_inquiries_marketing_consent_evidence_check
  check (
    not marketing_consent
    or (
      marketing_consent_at is not null
      and marketing_consent_version is not null
    )
  );

create table public.crm_marketing_consents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid not null references public.crm_contacts(id) on delete cascade,
  inquiry_id uuid references public.contact_inquiries(id) on delete set null,
  channel text not null default 'email' check (channel = 'email'),
  status text not null check (status in ('opted_in', 'opted_out')),
  consent_text_version text not null,
  consent_text text not null,
  source text not null,
  recorded_at timestamptz not null default now()
);

create table public.internal_notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  kind text not null check (kind in ('new_inquiry')),
  title text not null,
  body text not null,
  resource_type text not null,
  resource_id uuid not null,
  action_href text not null,
  created_at timestamptz not null default now()
);

create table public.internal_notification_reads (
  notification_id uuid not null references public.internal_notifications(id) on delete cascade,
  user_id uuid not null references public.internal_staff_users(user_id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

alter table public.crm_activities
  drop constraint if exists crm_activities_kind_check;

alter table public.crm_activities
  add constraint crm_activities_kind_check check (kind in (
    'email_inbound', 'email_outbound', 'call', 'meeting', 'note',
    'task_created', 'task_completed', 'account_created', 'status_change',
    'inquiry_received'
  ));

create index contact_inquiries_organization_idx
  on public.contact_inquiries (organization_id, created_at desc)
  where organization_id is not null;
create index contact_inquiries_contact_idx
  on public.contact_inquiries (contact_id, created_at desc)
  where contact_id is not null;
create index crm_marketing_consents_org_recorded_idx
  on public.crm_marketing_consents (organization_id, recorded_at desc);
create index crm_marketing_consents_contact_recorded_idx
  on public.crm_marketing_consents (contact_id, recorded_at desc);
create index crm_marketing_consents_inquiry_idx
  on public.crm_marketing_consents (inquiry_id)
  where inquiry_id is not null;
create index internal_notifications_created_idx
  on public.internal_notifications (created_at desc);
create index internal_notifications_organization_idx
  on public.internal_notifications (organization_id, created_at desc)
  where organization_id is not null;
create index internal_notification_reads_user_idx
  on public.internal_notification_reads (user_id, read_at desc);

alter table public.crm_marketing_consents enable row level security;
alter table public.internal_notifications enable row level security;
alter table public.internal_notification_reads enable row level security;

revoke all on public.crm_marketing_consents,
  public.internal_notifications,
  public.internal_notification_reads from anon, authenticated;

grant all on public.crm_marketing_consents,
  public.internal_notifications,
  public.internal_notification_reads to service_role;

create policy "No browser access to CRM marketing consent"
  on public.crm_marketing_consents for all to anon, authenticated
  using (false) with check (false);
create policy "No browser access to internal notifications"
  on public.internal_notifications for all to anon, authenticated
  using (false) with check (false);
create policy "No browser access to internal notification reads"
  on public.internal_notification_reads for all to anon, authenticated
  using (false) with check (false);

create or replace function public.create_contact_inquiry_lead(
  p_name text,
  p_email text,
  p_company text,
  p_locations text,
  p_message text,
  p_marketing_consent boolean default false
)
returns table (
  inquiry_id uuid,
  organization_id uuid,
  contact_id uuid,
  created_new_lead boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_inquiry_id uuid;
  v_organization_id uuid;
  v_contact_id uuid;
  v_created_new_lead boolean := false;
  v_consent_version constant text := 'website-contact-v1';
  v_consent_text constant text := 'I agree to receive occasional Costivra product updates and marketing emails. I can unsubscribe at any time.';
begin
  select c.id, c.organization_id
    into v_contact_id, v_organization_id
  from public.crm_contacts c
  join public.organizations o on o.id = c.organization_id
  left join public.crm_account_profiles cap on cap.organization_id = o.id
  where lower(c.email) = lower(p_email)
    and lower(o.name) = lower(p_company)
    and coalesce(cap.visible_in_crm, true)
  order by c.created_at asc
  limit 1;

  if v_organization_id is null then
    insert into public.organizations (name, primary_contact_name)
    values (p_company, p_name)
    returning id into v_organization_id;

    insert into public.crm_account_profiles (
      organization_id,
      lifecycle_stage,
      source,
      next_follow_up_at,
      next_step,
      visible_in_crm
    ) values (
      v_organization_id,
      'lead',
      'website_inquiry',
      now(),
      'Review inquiry and respond',
      true
    );

    insert into public.crm_contacts (
      organization_id,
      full_name,
      email,
      is_primary,
      status
    ) values (
      v_organization_id,
      p_name,
      lower(p_email),
      true,
      'active'
    ) returning id into v_contact_id;

    v_created_new_lead := true;
  end if;

  insert into public.contact_inquiries (
    name,
    email,
    company,
    locations,
    message,
    organization_id,
    contact_id,
    marketing_consent,
    marketing_consent_at,
    marketing_consent_version,
    source_path
  ) values (
    p_name,
    lower(p_email),
    p_company,
    nullif(p_locations, ''),
    p_message,
    v_organization_id,
    v_contact_id,
    p_marketing_consent,
    case when p_marketing_consent then now() else null end,
    case when p_marketing_consent then v_consent_version else null end,
    '/contact'
  ) returning id into v_inquiry_id;

  if p_marketing_consent then
    insert into public.crm_marketing_consents (
      organization_id,
      contact_id,
      inquiry_id,
      status,
      consent_text_version,
      consent_text,
      source
    ) values (
      v_organization_id,
      v_contact_id,
      v_inquiry_id,
      'opted_in',
      v_consent_version,
      v_consent_text,
      'website_contact_form'
    );
  end if;

  insert into public.crm_tasks (
    organization_id,
    contact_id,
    title,
    task_type,
    priority,
    status,
    due_at,
    notes
  ) values (
    v_organization_id,
    v_contact_id,
    'Respond to website inquiry',
    'follow_up',
    'high',
    'open',
    now(),
    'Created automatically from the public Costivra contact form.'
  );

  insert into public.crm_activities (
    organization_id,
    contact_id,
    kind,
    direction,
    subject,
    summary,
    metadata
  ) values (
    v_organization_id,
    v_contact_id,
    'inquiry_received',
    'inbound',
    'Website inquiry received',
    'A new public inquiry was captured and routed into the lead pipeline.',
    jsonb_build_object(
      'inquiry_id', v_inquiry_id,
      'marketing_consent', p_marketing_consent,
      'source', 'website_contact_form'
    )
  );

  insert into public.internal_notifications (
    organization_id,
    kind,
    title,
    body,
    resource_type,
    resource_id,
    action_href
  ) values (
    v_organization_id,
    'new_inquiry',
    'New website inquiry',
    p_name || ' at ' || p_company || ' submitted a new inquiry.',
    'contact_inquiry',
    v_inquiry_id,
    '/manage/accounts?account=' || v_organization_id::text
  );

  insert into public.audit_events (
    organization_id,
    actor_type,
    action,
    resource_type,
    resource_id,
    trace_id
  ) values (
    v_organization_id,
    'public_visitor',
    'contact_inquiry.created',
    'contact_inquiry',
    v_inquiry_id,
    gen_random_uuid()
  );

  return query select
    v_inquiry_id,
    v_organization_id,
    v_contact_id,
    v_created_new_lead;
end;
$$;

revoke all on function public.create_contact_inquiry_lead(
  text, text, text, text, text, boolean
) from public, anon, authenticated;

grant execute on function public.create_contact_inquiry_lead(
  text, text, text, text, text, boolean
) to service_role;

comment on table public.crm_marketing_consents is
  'Append-only evidence for explicit CRM contact email marketing consent and withdrawal.';
comment on table public.internal_notifications is
  'Server-only owner-portal notifications. Customer browser roles have no access.';
comment on function public.create_contact_inquiry_lead is
  'Atomically promotes a validated public inquiry into a visible staged CRM lead with task, activity, notification, consent evidence, and audit trail.';
