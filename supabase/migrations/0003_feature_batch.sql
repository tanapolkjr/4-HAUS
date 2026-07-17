-- ============================================================
-- 4 HAUS — Patch 0003 (feature batch)
-- Run once in the Supabase SQL editor, AFTER 0002.
--  • factories: platform becomes free text; adds city, MOQ, lead time
--  • factory_files: attach catalogs & documents (multiple per factory)
--  • products: IP rating + lead time (days)
--  • product_costs: custom shipping methods, agency ฿/%,
--    lowest selling price
--  • channel_options: target-market channels editable in Settings
-- ============================================================

-- ---------- factories ----------------------------------------
alter table public.factories drop constraint if exists factories_platform_check;
alter table public.factories
  add column if not exists city varchar(100),
  add column if not exists moq integer,
  add column if not exists lead_time varchar(50);

-- ---------- factory files -------------------------------------
create table if not exists public.factory_files (
  id          uuid primary key default gen_random_uuid(),
  factory_id  uuid not null references public.factories(id) on delete cascade,
  file_url    varchar(500) not null,    -- path inside bucket `product-media`
  file_name   varchar(200) not null,
  uploaded_by uuid references public.users(id),
  uploaded_at timestamptz not null default now()
);
create index if not exists factory_files_factory_idx on public.factory_files (factory_id);
alter table public.factory_files enable row level security;
drop policy if exists "factory_files_all_authenticated" on public.factory_files;
create policy "factory_files_all_authenticated" on public.factory_files
  for all to authenticated using (true) with check (true);

-- ---------- products ------------------------------------------
alter table public.products
  add column if not exists ip_rating varchar(50),
  add column if not exists lead_time_days integer;

-- ---------- product_costs -------------------------------------
alter table public.product_costs drop constraint if exists product_costs_shipping_method_check;
alter table public.product_costs
  alter column shipping_method type varchar(50);
alter table public.product_costs
  add column if not exists agency_is_percent boolean not null default false,
  add column if not exists agency_percent decimal(6,2),
  add column if not exists lowest_selling_price decimal(10,2);

-- ---------- editable target channels --------------------------
create table if not exists public.channel_options (
  id         uuid primary key default gen_random_uuid(),
  name       varchar(100) not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.channel_options enable row level security;
drop policy if exists "channel_options_all_authenticated" on public.channel_options;
create policy "channel_options_all_authenticated" on public.channel_options
  for all to authenticated using (true) with check (true);

insert into public.channel_options (name, sort_order) values
  ('Shopee', 0), ('Lazada', 1), ('Facebook', 2), ('Real Estate Developers', 3),
  ('Hotels', 4), ('Commercial Projects', 5), ('Government Projects', 6)
on conflict (name) do nothing;
