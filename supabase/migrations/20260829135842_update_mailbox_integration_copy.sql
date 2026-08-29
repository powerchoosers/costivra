update public.integrations
set description = case provider
  when 'microsoft-365' then 'Forward selected Outlook messages to the private workspace address, or authorize a scoped mailbox connection when enabled. Organization admins control vendor rules and revocation.'
  when 'gmail' then 'Forward selected Gmail messages to the private workspace address, or authorize a scoped mailbox connection when enabled. Organization admins control vendor rules and revocation.'
  else description
end,
updated_at = now()
where provider in ('microsoft-365', 'gmail');
