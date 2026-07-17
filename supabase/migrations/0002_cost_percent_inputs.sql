-- ============================================================
-- 4 HAUS — Patch 0002
-- 1) Fix "Save failed" on extreme margins: widen numeric columns
--    (gross_margin was decimal(5,2) and overflowed below -999.99%).
-- 2) Shipping cost & other costs can now be entered as a fixed
--    THB amount OR a percentage of the factory cost. The resolved
--    THB amount is still stored in shipping_cost / other_costs so
--    all existing calculations and history remain valid; the new
--    columns just remember how the value was entered.
-- Run once in the Supabase SQL editor.
-- ============================================================

alter table public.product_costs
  alter column gross_margin type decimal(8,2),
  alter column roi type decimal(10,2);

alter table public.product_costs
  add column if not exists shipping_is_percent boolean not null default false,
  add column if not exists shipping_percent decimal(6,2),
  add column if not exists other_is_percent boolean not null default false,
  add column if not exists other_percent decimal(6,2);
