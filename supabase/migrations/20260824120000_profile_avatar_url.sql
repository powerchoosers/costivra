alter table public.profiles
  add column if not exists avatar_url text;

alter table public.profiles
  add constraint profiles_avatar_url_https_check
  check (avatar_url is null or (char_length(avatar_url) <= 2048 and avatar_url ~ '^https://'));

comment on column public.profiles.avatar_url is
  'HTTPS profile image URL supplied by an authenticated identity provider; display-only and never used for authorization.';

grant update (avatar_url) on public.profiles to authenticated;
