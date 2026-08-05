-- Migration: Seed Canonical Vendor Markets and Insurance Categories
-- Description: Seeds parent taxonomy, launch leaves, and insurance & employee benefits categories

-- 1. Ensure unique constraint on vendor_categories(slug)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'vendor_categories_slug_key'
  ) then
    alter table public.vendor_categories add constraint vendor_categories_slug_key unique (slug);
  end if;
end $$;

-- 2. Seed Parent Categories
insert into public.vendor_categories (name, slug, canonical_key, parent_id, status, description, created_source)
values
  ('Energy & Utilities', 'energy-utilities', 'energy-utilities', null, 'verified', 'Commercial electricity, natural gas, delivery demand, and utility infrastructure', 'system_seed'),
  ('Telecom & Connectivity', 'telecom-connectivity', 'telecom-connectivity', null, 'verified', 'Business broadband, dedicated internet access, mobile, voice, and WAN networking', 'system_seed'),
  ('Technology & Software', 'technology', 'technology', null, 'verified', 'SaaS subscriptions, cloud infrastructure, AI API consumption, and cybersecurity', 'system_seed'),
  ('Insurance & Employee Benefits', 'insurance-benefits', 'insurance-benefits', null, 'verified', 'Commercial P&C coverage, workers compensation, cyber, group health, and employee benefit programs', 'system_seed'),
  ('Waste & Environmental Services', 'waste-environmental', 'waste-environmental', null, 'verified', 'Solid waste, recycling, hazardous industrial waste, and medical waste management', 'system_seed'),
  ('Facilities & Property Services', 'facilities-property-services', 'facilities-property-services', null, 'verified', 'Uniforms, linen, janitorial, HVAC maintenance, and property services', 'system_seed'),
  ('Real Estate & Occupancy', 'real-estate-occupancy', 'real-estate-occupancy', null, 'verified', 'Commercial lease, CAM charges, property taxes, and space management', 'system_seed'),
  ('Payments & Financial Services', 'payments-finance', 'payments-finance', null, 'verified', 'Merchant processing, credit card interchange, payment gateways, and banking fees', 'system_seed'),
  ('Workforce & HR Services', 'workforce-hr', 'workforce-hr', null, 'verified', 'PEO, payroll processing, staffing, and human capital software', 'system_seed'),
  ('Logistics & Fleet Operations', 'logistics-fleet', 'logistics-fleet', null, 'verified', 'Fleet vehicle lease, fuel cards, freight, and shipping logistics', 'system_seed'),
  ('Food & Hospitality Operations', 'food-hospitality', 'food-hospitality', null, 'verified', 'Foodservice distribution, commercial kitchen equipment, and POS operations', 'system_seed'),
  ('Office & Professional Services', 'office-professional', 'office-professional', null, 'verified', 'Legal, audit, accounting, office supplies, and document management', 'system_seed'),
  ('Healthcare & Regulated Operations', 'healthcare-regulated', 'healthcare-regulated', null, 'verified', 'Clinical compliance, pharmaceutical supplies, and medical equipment', 'system_seed'),
  ('Industrial & Manufacturing', 'industrial-manufacturing', 'industrial-manufacturing', null, 'verified', 'Raw materials, MRO supplies, machinery lease, and industrial gases', 'system_seed'),
  ('Taxes, Permits & Public Fees', 'taxes-permits-public-fees', 'taxes-permits-public-fees', null, 'verified', 'Municipal permits, licensing, government fees, and public tax surcharges', 'system_seed'),
  ('Unknown Category', 'unknown', 'unknown', null, 'draft', 'Unclassified or ambiguous expense category requiring human or system review', 'system_seed')
on conflict (slug) do update set
  canonical_key = excluded.canonical_key,
  status = excluded.status,
  description = excluded.description,
  updated_at = now();

-- 3. Seed Child / Leaf Categories
insert into public.vendor_categories (name, slug, canonical_key, parent_id, status, description, created_source)
select child.name, child.slug, child.canonical_key, p.id, child.status, child.description, 'system_seed'
from (
  values
    -- Energy
    ('Commercial Electricity Supply', 'commercial-electricity-supply', 'commercial-electricity-supply', 'energy-utilities', 'verified', 'Deregulated kWh supply contracts and retail energy provider charges'),
    ('Electric Delivery & Demand', 'electric-delivery-demand', 'electric-delivery-demand', 'energy-utilities', 'verified', 'Regulated utility distribution, transmission, peak demand kW, and ratchet fees'),
    ('Commercial Natural Gas', 'commercial-natural-gas', 'commercial-natural-gas', 'energy-utilities', 'verified', 'Therms supply, pipeline transportation, and gas balancing fees'),
    ('Water, Sewer & Stormwater', 'water-sewer-stormwater', 'water-sewer-stormwater', 'energy-utilities', 'verified', 'Municipal water usage, sewer discharge, and stormwater fees'),
    
    -- Telecom
    ('Business Broadband & DIA', 'business-broadband-dia', 'business-broadband-dia', 'telecom-connectivity', 'verified', 'Dedicated internet access, ethernet circuits, and business broadband'),
    ('Wireless & Mobility', 'wireless-mobility', 'wireless-mobility', 'telecom-connectivity', 'verified', 'Corporate mobile plans, SIM data pools, and device line access'),
    ('Voice, SIP & UCaaS / CCaaS', 'voice-sip-ucaas-ccaas', 'voice-sip-ucaas-ccaas', 'telecom-connectivity', 'verified', 'SIP trunking, hosted VoIP, contact center, and cloud PBX seats'),
    ('WAN, SD-WAN & MPLS', 'wan-sdwan-mpls', 'wan-sdwan-mpls', 'telecom-connectivity', 'verified', 'Multi-site private WAN, MPLS networking, and SD-WAN orchestration'),
    
    -- Tech
    ('SaaS & Software Subscriptions', 'saas-subscriptions', 'saas-subscriptions', 'technology', 'verified', 'Enterprise software licenses, seat subscriptions, and recurring cloud tools'),
    ('Cloud IaaS & PaaS', 'cloud-iaas-paas', 'cloud-iaas-paas', 'technology', 'verified', 'AWS, Azure, Google Cloud compute, storage, and database infrastructure'),
    ('AI & API Consumption', 'ai-api-consumption', 'ai-api-consumption', 'technology', 'verified', 'LLM API tokens, developer platform usage, and vector database queries'),
    ('Cybersecurity & InfoSec', 'cybersecurity', 'cybersecurity', 'technology', 'verified', 'EDR agents, SIEM log ingestion, SOC monitoring, and vulnerability scanning'),
    
    -- Insurance & Benefits
    ('Commercial Property Insurance', 'commercial-property', 'commercial-property', 'insurance-benefits', 'verified', 'Building, contents, business interruption, and equipment breakdown coverage'),
    ('General Liability & BOP', 'general-liability-bop', 'general-liability-bop', 'insurance-benefits', 'verified', 'Commercial general liability, businessowners policies, and slip-and-fall protection'),
    ('Workers Compensation Insurance', 'workers-compensation', 'workers-compensation', 'insurance-benefits', 'verified', 'Statutory employee injury coverage, class code premiums, and payroll audits'),
    ('Commercial Auto Insurance', 'commercial-auto', 'commercial-auto', 'insurance-benefits', 'verified', 'Fleet vehicle liability, physical damage, and hired/non-owned auto coverage'),
    ('Cyber Insurance', 'cyber-insurance', 'cyber-insurance', 'insurance-benefits', 'verified', 'First-party ransomware, data breach response, and third-party cyber liability'),
    ('Umbrella & Excess Liability', 'umbrella-excess', 'umbrella-excess', 'insurance-benefits', 'verified', 'Excess liability coverage above underlying GL, auto, and employers liability'),
    ('Group Health Insurance', 'group-health', 'group-health', 'insurance-benefits', 'verified', 'Employer-sponsored major medical, PPO/HDHP plans, and carrier premium administration'),
    ('Dental, Vision, Life & Disability', 'dental-vision-life-disability', 'dental-vision-life-disability', 'insurance-benefits', 'verified', 'Group dental, vision, short/long-term disability, and term life insurance'),
    ('Stop-Loss, PBM & Benefits Admin', 'stop-loss-pbm-benefits-admin', 'stop-loss-pbm-benefits-admin', 'insurance-benefits', 'verified', 'Self-funded medical stop-loss reinsurance, pharmacy benefit management, and TPA fees'),
    
    -- Waste
    ('Solid Waste & Recycling', 'solid-waste-recycling', 'solid-waste-recycling', 'waste-environmental', 'verified', 'Dumpster hauling, compactors, single-stream recycling, and contamination fees'),
    ('Hazardous & Industrial Waste', 'hazardous-industrial-waste', 'hazardous-industrial-waste', 'waste-environmental', 'verified', 'Chemical waste, solvent disposal, oil recovery, and EPA manifest handling'),
    ('Medical & Biohazard Waste', 'medical-waste', 'medical-waste', 'waste-environmental', 'verified', 'Sharps disposal, red bag medical waste, and OSHA compliance destruction'),
    
    -- Facilities
    ('Uniforms, Linen & Facility Mats', 'uniforms-linen-mats', 'uniforms-linen-mats', 'facilities-property-services', 'verified', 'Garment rental, industrial laundering, shop towels, and entrance mat service'),
    
    -- Food
    ('Foodservice & Broadline Distribution', 'foodservice-distribution', 'foodservice-distribution', 'food-hospitality', 'verified', 'Sysco, US Foods broadline food distribution, ingredients, and kitchen disposables'),
    
    -- Payments
    ('Merchant Processing & Interchange', 'merchant-processing', 'merchant-processing', 'payments-finance', 'verified', 'Credit card interchange, card brand assessment fees, and merchant processor markups'),
    ('Payment Gateways & POS Fees', 'payment-gateways', 'payment-gateways', 'payments-finance', 'verified', 'Online payment gateway authorization, terminal lease, and transaction fees')
) as child(name, slug, canonical_key, parent_slug, status, description)
join public.vendor_categories p on p.slug = child.parent_slug
on conflict (slug) do update set
  canonical_key = excluded.canonical_key,
  parent_id = excluded.parent_id,
  status = excluded.status,
  description = excluded.description,
  updated_at = now();
