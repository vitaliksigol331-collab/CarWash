-- =====================================================================
-- МІГРАЦІЯ 4: Прайс-лист за типом кузова + автосписання зі складу
-- Виконай У Supabase Dashboard → SQL Editor → New query, ПІСЛЯ migration_03
-- Доповнення, нічого не видаляє.
-- =====================================================================

-- 1. Нотатка до ціни (наприклад, причина знижки чи надбавки)
alter table public.car_entries
  add column if not exists price_note text;

-- 1а. Посада працівника
alter table public.employees
  add column if not exists position text;

-- 1б. Щоденна ціль (наприклад, "5 авто в день")
alter table public.stores
  add column if not exists daily_car_goal numeric(6,0);

-- 1в. Джерело коштів витрати: з каси мийки чи з особистих коштів власника
-- (потрібно, щоб можна було бачити, скільки довелось "доплатити з кишені",
-- не ламаючи при цьому загальний розрахунок чистого прибутку мийки)
alter table public.expense_entries
  add column if not exists funding_source text not null default 'Каса мийки';

-- 2. Прайс-лист: базова ціна для кожної пари "послуга + тип кузова"
create table if not exists public.price_list (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  service text not null,
  body_type text not null,
  price numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (store_id, service, body_type)
);

alter table public.price_list enable row level security;

create policy "select own price_list" on public.price_list
  for select using (store_id = public.current_store_id());
create policy "insert own price_list" on public.price_list
  for insert with check (store_id = public.current_store_id());
create policy "update own price_list" on public.price_list
  for update using (store_id = public.current_store_id());
create policy "delete own price_list" on public.price_list
  for delete using (store_id = public.current_store_id());

-- 3. Зв'язок "послуга → який матеріал і скільки витрачається за 1 миття"
create table if not exists public.service_materials (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  service text not null,
  warehouse_item_id uuid not null references public.warehouse_items(id) on delete cascade,
  quantity_per_wash numeric(12,3) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists service_materials_store_service_idx
  on public.service_materials (store_id, service);

alter table public.service_materials enable row level security;

create policy "select own service_materials" on public.service_materials
  for select using (store_id = public.current_store_id());
create policy "insert own service_materials" on public.service_materials
  for insert with check (store_id = public.current_store_id());
create policy "update own service_materials" on public.service_materials
  for update using (store_id = public.current_store_id());
create policy "delete own service_materials" on public.service_materials
  for delete using (store_id = public.current_store_id());

-- =====================================================================
-- Тригер: коли додається авто з певною послугою — автоматично
-- зменшує залишки прив'язаних матеріалів на складі.
-- Коли запис про авто видаляється — повертає списане назад (сторно),
-- на випадок помилкового додавання.
-- =====================================================================
create or replace function public.apply_material_usage()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  rec record;
  usage_sign int;
  target_service text;
  target_store uuid;
begin
  if tg_op = 'INSERT' then
    usage_sign := -1;
    target_service := new.service;
    target_store := new.store_id;
  elsif tg_op = 'DELETE' then
    usage_sign := 1;
    target_service := old.service;
    target_store := old.store_id;
  end if;

  for rec in
    select warehouse_item_id, quantity_per_wash
    from public.service_materials
    where store_id = target_store and service = target_service
  loop
    update public.warehouse_items
    set quantity = quantity + (usage_sign * rec.quantity_per_wash)
    where id = rec.warehouse_item_id;
  end loop;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists car_entries_apply_material_usage on public.car_entries;
create trigger car_entries_apply_material_usage
  after insert or delete on public.car_entries
  for each row execute procedure public.apply_material_usage();
