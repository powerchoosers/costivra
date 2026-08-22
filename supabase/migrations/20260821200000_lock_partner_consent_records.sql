-- Consent evidence is append-only. The application may create a record, but
-- must never rewrite or delete the disclosure a customer accepted or declined.
revoke update, delete on public.partner_referral_consents from authenticated;

drop policy if exists "Members can update own organization referral consents"
  on public.partner_referral_consents;

comment on table public.partner_referral_consents is
  'Append-only disclosure and purpose-specific consent evidence for partner routing.';
