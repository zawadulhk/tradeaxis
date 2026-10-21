-- ============================================================================
-- TRADEAXIS GLOBAL VENTURES — SUPABASE POSTGRESQL SCHEMA
-- Execute this script in your Supabase Project: SQL Editor -> New Query -> Run
-- ============================================================================

-- 1. COMMERCIAL INQUIRIES & RFQs CRM TABLE
create table if not exists public.inquiries (
  id text primary key,
  created_at timestamptz not null default now(),
  inquiry_type text not null default 'rfq',       -- 'rfq' or 'general'
  full_name text not null,
  company_name text,
  email text,
  phone text,
  product_requirement text,
  volume_port text,
  subject text,
  message text,
  status text not null default 'new',             -- 'new', 'reviewed', 'quoted', 'contacted', 'closed'
  admin_notes text default '',
  updated_at timestamptz not null default now()
);

-- Indexing for rapid queries
create index if not exists idx_inquiries_created_at on public.inquiries (created_at desc);
create index if not exists idx_inquiries_status on public.inquiries (status);
create index if not exists idx_inquiries_type on public.inquiries (inquiry_type);

-- 2. PRODUCTS & INDENTING CATALOG TABLE
create table if not exists public.products (
  id text primary key,
  created_at timestamptz not null default now(),
  name text not null,
  category text not null default 'jute',          -- 'jute', 'polymers', 'pharma', 'masterbatch'
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

-- Inquiries: allow public submission (anon insert), allow service role / API all
create policy "Public can submit inquiries"
  on public.inquiries for insert
  with check (true);

create policy "Service role and anon full inquiries access"
  on public.inquiries for all
  using (true)
  with check (true);

-- Products: allow public read, allow service role all
create policy "Public can read products"
  on public.products for select
  using (true);

create policy "Allow all product modifications"
  on public.products for all
  using (true)
  with check (true);

-- News: allow public read, allow service role all
create policy "Public can read published news"
  on public.news_articles for select
  using (true);

create policy "Allow all news modifications"
  on public.news_articles for all
  using (true)
  with check (true);
