alter table public.vendors
  add column if not exists search_aliases text[] not null default '{}'::text[],
  add column if not exists is_suggested boolean not null default false;

alter table public.organization_vendors
  add column if not exists spend_cadence text not null default 'annual'
    check (spend_cadence in ('monthly', 'annual'));

create index if not exists vendors_suggested_name_idx
  on public.vendors (is_suggested, canonical_name);

insert into public.vendors (canonical_name, category, website, support_channels, search_aliases, is_suggested)
values
  ('Microsoft 365', 'Software', 'https://www.microsoft.com/microsoft-365/business', '["web"]'::jsonb, array['Microsoft Office','Office 365','M365'], true),
  ('Google Workspace', 'Software', 'https://workspace.google.com', '["web"]'::jsonb, array['G Suite','Google Business'], true),
  ('Adobe Creative Cloud', 'Software', 'https://www.adobe.com/creativecloud/business.html', '["web"]'::jsonb, array['Adobe CC','Creative Cloud'], true),
  ('Salesforce', 'Software', 'https://www.salesforce.com', '["web","phone"]'::jsonb, array['Sales Cloud','Service Cloud'], true),
  ('Slack', 'Software', 'https://slack.com', '["web"]'::jsonb, array['Slack Business'], true),
  ('Zoom', 'Software', 'https://www.zoom.com', '["web"]'::jsonb, array['Zoom Workplace','Zoom Video'], true),
  ('Dropbox Business', 'Software', 'https://www.dropbox.com/business', '["web"]'::jsonb, array['Dropbox'], true),
  ('DocuSign', 'Software', 'https://www.docusign.com', '["web"]'::jsonb, array['Docusign eSignature'], true),
  ('QuickBooks Online', 'Software', 'https://quickbooks.intuit.com', '["web","phone"]'::jsonb, array['Intuit QuickBooks','QBO'], true),
  ('Xero', 'Software', 'https://www.xero.com', '["web"]'::jsonb, array['Xero Accounting'], true),
  ('HubSpot', 'Software', 'https://www.hubspot.com', '["web"]'::jsonb, array['HubSpot CRM'], true),
  ('Atlassian', 'Software', 'https://www.atlassian.com', '["web"]'::jsonb, array['Jira','Confluence'], true),
  ('Asana', 'Software', 'https://asana.com', '["web"]'::jsonb, array['Asana Work Management'], true),
  ('Monday.com', 'Software', 'https://monday.com', '["web"]'::jsonb, array['Monday','Monday Work Management'], true),
  ('Notion', 'Software', 'https://www.notion.com', '["web"]'::jsonb, array['Notion Business'], true),
  ('Canva', 'Software', 'https://www.canva.com/business', '["web"]'::jsonb, array['Canva Business','Canva Teams'], true),
  ('Zendesk', 'Software', 'https://www.zendesk.com', '["web"]'::jsonb, array['Zendesk Suite'], true),
  ('GitHub', 'Software', 'https://github.com/enterprise', '["web"]'::jsonb, array['GitHub Enterprise','Github'], true),
  ('Amazon Web Services', 'Software', 'https://aws.amazon.com', '["web"]'::jsonb, array['AWS','Amazon AWS'], true),
  ('Microsoft Azure', 'Software', 'https://azure.microsoft.com', '["web"]'::jsonb, array['Azure'], true),
  ('Google Cloud', 'Software', 'https://cloud.google.com', '["web"]'::jsonb, array['GCP','Google Cloud Platform'], true),
  ('Shopify', 'Software', 'https://www.shopify.com', '["web"]'::jsonb, array['Shopify Plus'], true),
  ('Toast', 'Software', 'https://pos.toasttab.com', '["web","phone"]'::jsonb, array['Toast POS','Toasttab'], true),
  ('RingCentral', 'Telecom & Internet', 'https://www.ringcentral.com', '["web","phone"]'::jsonb, array['RingCentral MVP','Ring Central'], true),
  ('Verizon Business', 'Telecom & Internet', 'https://www.verizon.com/business', '["web","phone"]'::jsonb, array['Verizon Wireless','Verizon Fios'], true),
  ('AT&T Business', 'Telecom & Internet', 'https://www.business.att.com', '["web","phone"]'::jsonb, array['ATT Business','AT&T Wireless'], true),
  ('Comcast Business', 'Telecom & Internet', 'https://business.comcast.com', '["web","phone"]'::jsonb, array['Comcast','Xfinity Business'], true),
  ('Spectrum Business', 'Telecom & Internet', 'https://www.spectrum.com/business', '["web","phone"]'::jsonb, array['Charter Spectrum','Spectrum Enterprise'], true),
  ('T-Mobile for Business', 'Telecom & Internet', 'https://www.t-mobile.com/business', '["web","phone"]'::jsonb, array['T-Mobile Business','TMobile'], true),
  ('Cox Business', 'Telecom & Internet', 'https://www.cox.com/business', '["web","phone"]'::jsonb, array['Cox Communications'], true),
  ('Lumen', 'Telecom & Internet', 'https://www.lumen.com', '["web","phone"]'::jsonb, array['CenturyLink Business','Level 3'], true),
  ('Frontier Business', 'Telecom & Internet', 'https://frontier.com/business', '["web","phone"]'::jsonb, array['Frontier Communications'], true),
  ('Direct Energy Business', 'Commercial Energy', 'https://business.directenergy.com', '["web","phone"]'::jsonb, array['Direct Energy'], true),
  ('Constellation', 'Commercial Energy', 'https://www.constellation.com/solutions/for-your-business.html', '["web","phone"]'::jsonb, array['Constellation Energy'], true),
  ('ENGIE Resources', 'Commercial Energy', 'https://www.engieresources.com', '["web","phone"]'::jsonb, array['Engie','GDF Suez Energy Resources'], true),
  ('TXU Energy', 'Commercial Energy', 'https://www.txu.com/business', '["web","phone"]'::jsonb, array['TXU Business'], true),
  ('Reliant', 'Commercial Energy', 'https://www.reliant.com/en/business', '["web","phone"]'::jsonb, array['Reliant Energy','NRG Reliant'], true),
  ('Shell Energy', 'Commercial Energy', 'https://www.shellenergy.com', '["web","phone"]'::jsonb, array['Shell Energy Solutions'], true),
  ('Calpine Energy Solutions', 'Commercial Energy', 'https://www.calpinesolutions.com', '["web","phone"]'::jsonb, array['Calpine'], true),
  ('APG&E', 'Commercial Energy', 'https://www.apge.com', '["web","phone"]'::jsonb, array['APGE','AP Gas and Electric'], true)
on conflict (canonical_name) do update
set category = excluded.category,
    website = excluded.website,
    support_channels = excluded.support_channels,
    search_aliases = excluded.search_aliases,
    is_suggested = true;

update public.vendors
set is_suggested = true
where canonical_name in ('Adobe', 'Microsoft', 'Direct Energy');

comment on column public.vendors.search_aliases is
  'Curated search terms for canonical vendor matching; never customer financial data.';
comment on column public.organization_vendors.spend_cadence is
  'Cadence of the manually entered source amount before Costivra annualized it.';
