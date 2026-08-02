-- Optional contact details used only for the authenticated operator's email signature.
-- Existing profile RLS policies continue to govern access to this row.
alter table public.profiles
  add column if not exists job_title text,
  add column if not exists phone text,
  add column if not exists linkedin_url text;

comment on column public.profiles.job_title is 'Optional title shown in the operator email signature.';
comment on column public.profiles.phone is 'Optional phone number shown in the operator email signature.';
comment on column public.profiles.linkedin_url is 'Optional LinkedIn URL shown in the operator email signature.';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_job_title_length_check'
  ) then
    alter table public.profiles add constraint profiles_job_title_length_check
      check (job_title is null or char_length(btrim(job_title)) <= 120);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_phone_length_check'
  ) then
    alter table public.profiles add constraint profiles_phone_length_check
      check (phone is null or char_length(btrim(phone)) <= 48);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_linkedin_url_length_check'
  ) then
    alter table public.profiles add constraint profiles_linkedin_url_length_check
      check (linkedin_url is null or char_length(btrim(linkedin_url)) <= 320);
  end if;
end $$;
