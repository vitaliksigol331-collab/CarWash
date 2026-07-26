-- =====================================================================
-- МІГРАЦІЯ 7: Кілька послуг на одне авто (наприклад, Комплекс + Мийка двигуна)
-- Виконай У Supabase Dashboard → SQL Editor → New query, ПІСЛЯ migration_06
-- =====================================================================

-- Таблиця-зв'язка: одне авто (car_entries) — кілька послуг, кожна зі своєю ціною
create table if not exists public.car_entry_services (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  car_entry_id uuid not null references public.car_entries(id) on delete cascade,
  entry_date date not null,
  service text not null,
  price numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists car_entry_services_car_entry_idx
  on public.car_entry_services (car_entry_id);
create index if not exists car_entry_services_store_date_idx
  on public.car_entry_services (store_id, entry_date);

alter table public.car_entry_services enable row level security;

create policy "select own car_entry_services" on public.car_entry_services
  for select using (store_id = public.current_store_id());
create policy "insert own car_entry_services" on public.car_entry_services
  for insert with check (store_id = public.current_store_id());
create policy "update own car_entry_services" on public.car_entry_services
  for update using (store_id = public.current_store_id());
create policy "delete own car_entry_services" on public.car_entry_services
  for delete using (store_id = public.current_store_id());

-- Переносимо старі записи (де було по одній послузі на авто) у нову таблицю
insert into public.car_entry_services (store_id, car_entry_id, entry_date, service, price)
select store_id, id, entry_date, service, price
from public.car_entries
where not exists (
  select 1 from public.car_entry_services ces where ces.car_entry_id = car_entries.id
);

-- =====================================================================
-- Ціна авто (car_entries.price) тепер завжди дорівнює сумі його послуг
-- =====================================================================
create or replace function public.sync_car_entry_price()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target_entry uuid;
  total numeric;
begin
  target_entry := coalesce(new.car_entry_id, old.car_entry_id);

  select coalesce(sum(price), 0) into total
  from public.car_entry_services
  where car_entry_id = target_entry;

  update public.car_entries set price = total where id = target_entry;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists car_entry_services_sync_price on public.car_entry_services;
create trigger car_entry_services_sync_price
  after insert or update or delete on public.car_entry_services
  for each row execute procedure public.sync_car_entry_price();

-- =====================================================================
-- Автосписання зі складу тепер прив'язане до КОЖНОЇ окремої послуги авто,
-- а не до всього авто цілим (щоб коректно списувати за кожну з кількох послуг)
-- =====================================================================
drop trigger if exists car_entries_apply_material_usage on public.car_entries;

create or replace function public.apply_material_usage_per_service()
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

drop trigger if exists car_entry_services_material_usage on public.car_entry_services;
create trigger car_entry_services_material_usage
  after insert or delete on public.car_entry_services
  for each row execute procedure public.apply_material_usage_per_service();
