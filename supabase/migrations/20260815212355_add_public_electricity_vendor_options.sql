-- Public electricity examples identified during Packet 04 inventory.
-- These are customer-selectable vendor candidates, not proof of a Costivra
-- partnership or a claim that every provider serves every customer location.
insert into public.vendors (
  canonical_name,
  category,
  website,
  support_channels,
  search_aliases,
  is_suggested,
  catalog_status,
  created_source,
  source_confidence
)
values
  ('Con Edison', 'Commercial Energy', 'https://www.coned.com', '["web","phone"]'::jsonb, array['ConEd','Consolidated Edison'], true, 'candidate', 'public_sample_inventory', 0.95),
  ('ComEd', 'Commercial Energy', 'https://www.comed.com', '["web","phone"]'::jsonb, array['Commonwealth Edison','Commonwealth Edison Company'], true, 'candidate', 'public_sample_inventory', 0.95),
  ('Austin Energy', 'Commercial Energy', 'https://austinenergy.com', '["web","phone"]'::jsonb, array['Austin Electric','City of Austin Utilities'], true, 'candidate', 'public_sample_inventory', 0.95),
  ('Florida Power & Light', 'Commercial Energy', 'https://www.fpl.com', '["web","phone"]'::jsonb, array['FPL','Florida Power and Light'], true, 'candidate', 'public_sample_inventory', 0.95),
  ('Duke Energy Florida', 'Commercial Energy', 'https://www.duke-energy.com/home', '["web","phone"]'::jsonb, array['Duke Energy','DEF'], true, 'candidate', 'public_sample_inventory', 0.95),
  ('Tampa Electric Company', 'Commercial Energy', 'https://www.tampaelectric.com', '["web","phone"]'::jsonb, array['TECO','Tampa Electric'], true, 'candidate', 'public_sample_inventory', 0.95),
  ('Florida Public Utilities Company', 'Commercial Energy', 'https://www.fpu.com', '["web","phone"]'::jsonb, array['FPUC','Florida Public Utilities'], true, 'candidate', 'public_sample_inventory', 0.95)
on conflict (canonical_name) do update
set category = excluded.category,
    website = excluded.website,
    support_channels = excluded.support_channels,
    search_aliases = excluded.search_aliases,
    is_suggested = true,
    catalog_status = excluded.catalog_status,
    created_source = excluded.created_source,
    source_confidence = excluded.source_confidence;
