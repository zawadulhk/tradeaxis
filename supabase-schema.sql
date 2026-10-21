-- ============================================================================
-- TRADEAXIS GLOBAL VENTURES — COMPREHENSIVE SUPABASE POSTGRESQL SCHEMA & SEED
-- Run this complete script in Supabase: SQL Editor -> New Query -> Run
-- ============================================================================

-- 1. COMMERCIAL INQUIRIES CRM TABLE
create table if not exists public.inquiries (
  id text primary key,
  created_at timestamptz not null default now(),
  inquiry_type text not null default 'enquiry',
  full_name text not null,
  company_name text,
  email text,
  phone text,
  product_requirement text,
  volume_port text,
  subject text,
  message text,
  status text not null default 'new',
  admin_notes text default '',
  updated_at timestamptz not null default now()
);

-- Convert id to text if created previously as uuid
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'inquiries' and column_name = 'id' and data_type = 'uuid'
  ) then
    alter table public.inquiries alter column id type text using id::text;
  end if;

  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'products' and column_name = 'id' and data_type = 'uuid'
  ) then
    alter table public.products alter column id type text using id::text;
  end if;
end $$;

-- Ensure all columns exist even if table was created previously
alter table public.inquiries add column if not exists inquiry_type text default 'enquiry';
alter table public.inquiries alter column inquiry_type set default 'enquiry';
alter table public.inquiries add column if not exists company_name text;
alter table public.inquiries add column if not exists phone text;
alter table public.inquiries add column if not exists product_requirement text;
alter table public.inquiries add column if not exists volume_port text;
alter table public.inquiries add column if not exists subject text;
alter table public.inquiries add column if not exists status text default 'new';
alter table public.inquiries add column if not exists admin_notes text default '';
alter table public.inquiries add column if not exists updated_at timestamptz default now();

create index if not exists idx_inquiries_created_at on public.inquiries (created_at desc);
create index if not exists idx_inquiries_status on public.inquiries (status);
create index if not exists idx_inquiries_type on public.inquiries (inquiry_type);

-- 2. PRODUCTS & INDENTING CATALOG TABLE
create table if not exists public.products (
  id text primary key,
  created_at timestamptz not null default now(),
  name text not null,
  category text not null default 'jute',
  division text,
  badge text,
  description text,
  specs text,
  is_featured boolean not null default false
);

create index if not exists idx_products_category on public.products (category);
create index if not exists idx_products_featured on public.products (is_featured);

-- 3. MARKET INTELLIGENCE & NEWS TABLE
create table if not exists public.news_articles (
  id text primary key,
  created_at timestamptz not null default now(),
  title text not null,
  category text default 'Market Trends',
  publish_date text,
  read_time text default '3 min read',
  excerpt text,
  content text,
  published boolean not null default true
);

create index if not exists idx_news_created_at on public.news_articles (created_at desc);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
alter table public.inquiries enable row level security;
alter table public.products enable row level security;
alter table public.news_articles enable row level security;

-- Inquiries RLS Policies
drop policy if exists "Public can submit inquiries" on public.inquiries;
create policy "Public can submit inquiries"
  on public.inquiries for insert
  with check (true);

drop policy if exists "Service role and anon full inquiries access" on public.inquiries;
create policy "Service role and anon full inquiries access"
  on public.inquiries for all
  using (true)
  with check (true);

-- Products RLS Policies
drop policy if exists "Public can read products" on public.products;
create policy "Public can read products"
  on public.products for select
  using (true);

drop policy if exists "Allow all product modifications" on public.products;
create policy "Allow all product modifications"
  on public.products for all
  using (true)
  with check (true);

-- News RLS Policies
drop policy if exists "Public can read published news" on public.news_articles;
create policy "Public can read published news"
  on public.news_articles for select
  using (true);

drop policy if exists "Allow all news modifications" on public.news_articles;
create policy "Allow all news modifications"
  on public.news_articles for all
  using (true)
  with check (true);

-- ============================================================================
-- 5. SEED ALL 16 REAL PRODUCTS FROM FRONTEND WEBSITE
-- ============================================================================
insert into public.products (id, name, category, division, badge, description, specs, is_featured)
values
  ('prod-01', 'Natural Braided Jute Rugs', 'jute', 'Export Division (Jute Products)', '100% Biodegradable & Handwoven', 'Export-grade natural jute rugs crafted with intricate braided patterns. Suitable for eco-conscious home décor, international furniture retailers, and boutique hospitality spaces.', '• Origin: Bangladesh certified mills\n• Material: 100% Golden Jute Fiber\n• Patterns: Braided, Boucle, Custom weave\n• Sizes: Standard & bespoke export dimensions', true),
  ('prod-02', 'Custom Jute Tote & Fashion Bags', 'jute', 'Export Division (Jute Products)', 'Sustainable Retail & Promotional Bags', 'Durable, laminated or unlaminated eco-friendly jute shopping totes with padded cotton or rope handles. Fully customizable with screen printing or private branding for global department stores.', '• Handles: Padded cotton, cane, or round rope\n• Printing: AZO-free screen printing, custom Pantone\n• Lamination: Food-grade PP or unlaminated breathable\n• Custom branding: OEM / Private label available', true),
  ('prod-03', 'Handcrafted Baskets & Home Décor', 'jute', 'Export Division (Jute Products)', 'Lifestyle Storage & Tableware', 'Hand-coiled jute laundry hampers, nested storage baskets, decorative wall hangings, and dining table runners designed for modern minimalist interiors.', '• Craftsmanship: Traditional Bangladeshi artisan coiled\n• Compliance: US & EU eco-decor standards\n• Applications: Laundry hampers, planters, tabletop\n• Packaging: Export master cartons', true),
  ('prod-04', 'HDPE (High-Density Polyethylene)', 'plastic', 'Import & Indenting (Plastics & Resins)', 'Blow Molding & Pipe Extrusion', 'Prime virgin and near-prime HDPE grades offering excellent rigidity, impact resistance, and environmental stress crack resistance (ESCR) for bottles, caps, crates, and pressure pipes.', '• Melt Flow Index (MFI): 0.05 - 0.12 g/10min\n• Density: 0.952 - 0.956 g/cm³\n• Grades: Film, Blow Molding, Injection, Pipe\n• Compliance: REACH, FDA food grade compliant', true),
  ('prod-05', 'LDPE & LLDPE Film Grades', 'plastic', 'Import & Indenting (Plastics & Resins)', 'Blown Film & Rotomolding', 'High optical clarity, superior tensile strength, and puncture resistance. Ideal for packaging films, agricultural sheeting, shrink wrapping, and rotational molding applications.', '• MFI: 0.8 - 2.0 g/10min (Film), 4.0 - 6.0 (Rotomolding)\n• Density: 0.918 - 0.924 g/cm³\n• Features: High puncture resistance, superior sealability', true),
  ('prod-06', 'Polypropylene (PP) Homopolymer & Copolymer', 'plastic', 'Import & Indenting (Plastics & Resins)', 'Raffia & Injection Grade', 'Homopolymer for raffia tape, woven bags, and monofilament. Random and block copolymers for high clarity food containers, thermoforming sheets, and durable consumer housewares.', '• Grades: Raffia, Film (BOPP/CPP), Injection, Random Copo\n• MFI Range: 2.5 - 35 g/10min\n• Key Attributes: High rigidity, thermal resistance', true),
  ('prod-07', 'White & Black Masterbatch', 'masterbatch', 'Import & Indenting (Masterbatch)', 'High Opacity TiO2 & Carbon', 'White masterbatch with up to 70% rutile titanium dioxide for exceptional opacity and UV protection. Carbon black masterbatch with ultra-fine particle dispersion for smooth surface finish.', '• White: Up to 70% Rutile TiO2\n• Black: 30% - 50% Carbon Black\n• Carrier: PE / PP compatible\n• Applications: Blown film, injection, extrusion', true),
  ('prod-08', 'Custom Color & Additive Masterbatch', 'masterbatch', 'Import & Indenting (Masterbatch)', 'UV Stabilizers & Slip Agents', 'Precision color matching according to Pantone/RAL standards. Performance additive masterbatches including anti-static, anti-block, UV stabilizers, processing aids, and calcium carbonate filler concentrates.', '• Additives: UV HALS, Optical Brighteners, Slip & Antiblock\n• Color matching: Spectrophotometer precision\n• Carrier: Polyolefin matrix', false),
  ('prod-09', 'BOPP Films & Specialty Substrates', 'packaging', 'Packaging Materials & Converting', 'Plain, Matte & Metalized', 'Biaxially Oriented Polypropylene (BOPP) films designed for high-speed printing, laminating, and confectionery packaging. Exceptional barrier properties against moisture and gases.', '• Thickness: 12 to 50 microns\n• Types: Plain, Matte, Heat-Sealable, Metalized\n• Surface: Corona treated for superior ink adhesion', true),
  ('prod-10', 'OPP Tape Jumbo Rolls & In-Mould Labels', 'packaging', 'Packaging Materials & Converting', 'Converting & IML Films', 'Large format BOPP tape jumbo rolls with water-based acrylic adhesive for domestic tape slitting. High-definition In-Mould Labels (IML) and heat transfer printing films for plastic packaging containers.', '• Tape Width: 1280mm / 1620mm jumbo rolls\n• Adhesive: Water-based acrylic pressure-sensitive\n• IML: Gravure / Offset printed substrates', false),
  ('prod-11', 'Blister Foils & Alu-Alu Barrier Foils', 'pharma', 'Pharmaceutical Packaging & Security', 'Class 100,000 Cleanroom Certified', 'Medical-grade printed and plain aluminum push-through blister foils and cold-form Alu-Alu laminates offering zero moisture, oxygen, and light penetration for sensitive solid oral dosage formulations.', '• Push-Through: 20-25 micron Hard Tempered Aluminum / HSL\n• Cold-Form: OPA 25μm / Alu 45-50μm / PVC 60μm\n• Standards: US DMF registered, Cleanroom class 100,000', true),
  ('prod-12', 'Anti-Counterfeit Holographic Solutions', 'pharma', 'Pharmaceutical Packaging & Security', 'Brand Protection & Serialization', 'High-security optical holograms, void-evident security seals, variable 2D QR serialization, and security-printed foil substrates engineered to prevent unauthorized medicine duplication and grey-market diversion.', '• Technologies: Dot-matrix, e-beam kinetic optical effects\n• Features: Tamper-evident void release, nano-text\n• Tracking: Serialized QR / DataMatrix integration', true),
  ('prod-13', 'Full Cream & Skimmed Milk Powder', 'food', 'Food Ingredients & Dairy Solids', 'Imported Dairy Solids (Halal)', 'Premium imported dairy powders sourced from certified Oceania and European dairy producers. Consistent fat, protein, and moisture composition for dairy processing, confectionery, and bakery manufacturing.', '• Full Cream (FCMP): 26% - 28% Milk Fat\n• Skimmed (SMP): 1.25% Max Fat, Low/Medium/High heat\n• Packaging: 25kg multi-ply paper bags with PE liner\n• Certifications: Halal, ISO 22000, CODEX compliant', true),
  ('prod-14', 'Ice Cream Stabilizers & Functional Hydrocolloids', 'food', 'Food Ingredients & Emulsifiers', 'Texture & Melt Resistance', 'Specialized emulsifier-stabilizer blends engineered to optimize overrun, ensure smooth mouthfeel, and provide freeze-thaw stability in premium ice creams and frozen desserts. Also supplying Xanthan & Guar gums.', '• Blends: Integrated emulsifier & stabilizer systems\n• Hydrocolloids: Guar gum, Xanthan gum, Carrageenan\n• Applications: Hard pack, soft serve, frozen treats', true),
  ('prod-15', 'Plastic & Packaging Machinery', 'machinery', 'Industrial Machinery Sourcing', 'Extrusion & Converting Lines', 'Energy-efficient plastic injection molding machines, blown film extrusion lines, automatic high-speed slitter rewinders, and flow wrapping machinery sourced directly from verified Chinese and European manufacturers.', '• Lines: Single/multilayer blown film, Injection (80T - 1200T)\n• Converting: High-speed slitter rewinders, bag makers\n• Support: Turnkey commissioning & technical warranty', true),
  ('prod-16', 'Pharmaceutical & Food Processing Equipment', 'machinery', 'Industrial Machinery Sourcing', 'cGMP Compliant Cleanroom Machinery', 'Continuous ice cream freezers, pasteurization units, automated blister sealing and cartoning lines, tablet presses, and liquid filling lines built to cGMP and sanitary food safety standards.', '• Pharma: Blister thermoforming, rotary tablet press, cartoner\n• Food: Continuous ice cream freezers (150L - 1200L/hr)\n• Compliance: 316L stainless steel, cGMP, CE certified', true)
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  division = excluded.division,
  badge = excluded.badge,
  description = excluded.description,
  specs = excluded.specs,
  is_featured = excluded.is_featured;
