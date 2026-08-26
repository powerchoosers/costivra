update public.partner_destinations
set display_name = 'Commercial energy review partner',
    disclosure_version = 'partner-review-v2',
    disclosure_text = 'This is one of Costivra’s available partners. You may export the review to an advisor you choose or keep it in Costivra. Nothing will be shared until you approve the specific records and purpose.',
    updated_at = now()
where slug = 'ucep-energy-review';
