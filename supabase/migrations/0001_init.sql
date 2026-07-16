-- ============================================================
-- 4 HAUS — Database v2 (6 tables), per approved Database Design
-- Run once in the Supabase SQL editor (or `supabase db push`).
-- ============================================================

-- ---------- 1. users -----------------------------------------
-- Mirrors auth.users. No roles: equal access for all 4 members.
create table public.users (
  id         uuid primary key,             -- matches auth.users.id
  name       varchar(100) not null,
  email      varchar(150) not null unique,
  is_active  boolean not null default true, -- deactivate, never delete (spec §8)
  created_at timestamptz not null default now()
);

-- Auto-create a profile row on first login (architecture doc note).
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), new.email)
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------- 2. factories -------------------------------------
create table public.factories (
  id                 uuid primary key default gen_random_uuid(),
  name               varchar(150) not null unique,
  platform           varchar(30) check (platform in ('1688','Alibaba','Trade Show','Direct','Other')),
  contact_person     varchar(100),
  contact_phone      varchar(50),
  contact_email      varchar(150),
  wechat_or_whatsapp varchar(100),
  country            varchar(50) default 'China',
  notes              text,
  created_by         uuid references public.users(id),
  created_at         timestamptz not null default now()
);

-- ---------- 3. products --------------------------------------
create table public.products (
  id                   uuid primary key default gen_random_uuid(),
  factory_id           uuid not null references public.factories(id) on delete restrict,
  -- General
  name                 varchar(150) not null,
  model_number         varchar(100),
  source_url           varchar(500),
  product_notes        text,
  -- Category (fixed list, CHECK not ENUM per implementation notes)
  category             varchar(30) not null check (category in
    ('Smart Lock','Hotel Lock','Mini Lock','Smart Switch','Normal Switch','Plug & Socket','Others')),
  custom_category_name varchar(100),
  -- Functions / Specifications
  functions            text[] not null default '{}',
  material             varchar(50),
  color                text[] not null default '{}',
  certification        text[] not null default '{}',
  warranty             varchar(100),
  smart_home_compatibility text[] not null default '{}',
  -- Target market
  target_channels      text[] not null default '{}',
  -- Status / decision summaries
  status               varchar(30) not null default 'Draft' check (status in
    ('Draft','Under Evaluation','Scored','Decision Pending','Done')),
  decision_status      varchar(30) not null default 'Not Yet Evaluated' check (decision_status in
    ('Not Yet Evaluated','Approved','Interested','Waiting','Rejected')),
  -- Audit
  created_by           uuid references public.users(id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index products_factory_idx on public.products (factory_id);
create index products_status_idx  on public.products (status);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- ---------- 4. product_images --------------------------------
create table public.product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  image_url   varchar(500) not null,     -- path inside bucket `product-media`
  is_hero     boolean not null default false,
  caption     varchar(200),
  sort_order  integer default 0,
  uploaded_by uuid references public.users(id),
  uploaded_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id);

-- ---------- 5. product_costs (append-only history) -----------
create table public.product_costs (
  id                       uuid primary key default gen_random_uuid(),
  product_id               uuid not null references public.products(id) on delete cascade,
  currency                 varchar(10) not null default 'CNY' check (currency in ('CNY','USD','THB')),
  factory_price            decimal(10,2) not null check (factory_price >= 0),
  exchange_rate            decimal(10,4) not null default 1 check (exchange_rate > 0),
  shipping_method          varchar(30) check (shipping_method in ('Sea Freight','Air Freight','Express')),
  shipping_cost            decimal(10,2) default 0 check (shipping_cost >= 0),
  agency_cost              decimal(10,2) default 0 check (agency_cost >= 0),
  import_duty_percent      decimal(5,2)  default 0 check (import_duty_percent >= 0),
  vat_percent              decimal(5,2)  default 7 check (vat_percent >= 0),
  other_costs              decimal(10,2) default 0 check (other_costs >= 0),
  landed_cost              decimal(10,2) not null,
  suggested_selling_price  decimal(10,2),
  actual_selling_price     decimal(10,2),
  gross_profit             decimal(10,2),
  gross_margin             decimal(5,2),
  net_profit               decimal(10,2),
  roi                      decimal(6,2),
  created_by               uuid references public.users(id),
  created_at               timestamptz not null default now()
);
create index product_costs_product_idx on public.product_costs (product_id, created_at desc);

-- ---------- 6. evaluations (1:1 with product) -----------------
create table public.evaluations (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null unique references public.products(id) on delete cascade,
  scores          jsonb not null default '{}',   -- {criterion_key: 1..5, ...}, weights fixed in code
  comments        jsonb not null default '{}',   -- optional per-criterion notes (spec: "optional short comment")
  overall_score   decimal(3,1),
  decision_status varchar(30) not null default 'Not Yet Evaluated' check (decision_status in
    ('Not Yet Evaluated','Approved','Interested','Waiting','Rejected')),
  decision_reason text,
  evaluated_by    uuid references public.users(id),
  evaluated_at    timestamptz,
  updated_at      timestamptz not null default now()
);

create trigger evaluations_touch before update on public.evaluations
  for each row execute function public.touch_updated_at();

-- Sync decision_status onto products (database design §6 note).
create or replace function public.sync_decision_status()
returns trigger language plpgsql as $$
begin
  update public.products
     set decision_status = new.decision_status
   where id = new.product_id and decision_status is distinct from new.decision_status;
  return new;
end $$;

create trigger evaluations_sync_decision
  after insert or update of decision_status on public.evaluations
  for each row execute function public.sync_decision_status();

-- ---------- Row Level Security --------------------------------
-- Policy everywhere: "allow all actions for any authenticated user".
do $$
declare t text;
begin
  foreach t in array array['users','factories','products','product_images','product_costs','evaluations'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "%s_all_authenticated" on public.%I for all to authenticated using (true) with check (true)',
      t, t);
  end loop;
end $$;

-- ---------- Storage --------------------------------------------
-- Single bucket for hero + gallery images. Public read keeps image
-- rendering simple for a 4-person internal tool; writes require auth.
insert into storage.buckets (id, name, public) values ('product-media','product-media', true)
on conflict (id) do nothing;

create policy "product_media_read"   on storage.objects for select using (bucket_id = 'product-media');
create policy "product_media_insert" on storage.objects for insert to authenticated with check (bucket_id = 'product-media');
create policy "product_media_update" on storage.objects for update to authenticated using (bucket_id = 'product-media');
create policy "product_media_delete" on storage.objects for delete to authenticated using (bucket_id = 'product-media');
