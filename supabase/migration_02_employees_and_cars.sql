-- =====================================================================
-- МІГРАЦІЯ 2: Працівники + облік кожного авто окремо
-- Виконай У Supabase Dashboard → SQL Editor → New query, ПІСЛЯ schema.sql
-- Це доповнення, воно НЕ видаляє і не ламає існуючі дані.
-- =====================================================================

-- 1. Працівники
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  phone text,
  commission_percent numeric(5,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. Кожне авто окремим записом (замінює ручне введення "к-сть авто / дохід")
create table if not exists public.car_entries (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  entry_date date not null default current_date,
  service text not null,
  car_brand text,
  body_type text not null default 'Легкова',
  price numeric(12,2) not null default 0,
  employee_id uuid references public.employees(id) on delete set null,
  -- знімок імені та відсотка на момент запису — щоб історія не "перезаписувалась"
  -- заднім числом, якщо пізніше зміниш відсоток працівника чи видалиш його
  employee_name_snapshot text,
  commission_percent_snapshot numeric(5,2) not null default 0,
  commission_amount numeric(12,2) generated always as
    (round(price * commission_percent_snapshot / 100, 2)) stored,
  created_at timestamptz not null default now()
);

create index if not exists car_entries_store_date_idx
  on public.car_entries (store_id, entry_date);

create index if not exists car_entries_employee_idx
  on public.car_entries (employee_id);

-- 3. Унікальність: одна мийка — один запис work_days на дату
--    (потрібно для автоматичного оновлення доходу/к-сті авто нижче)
alter table public.work_days
  add column if not exists updated_by_trigger boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'work_days_store_date_unique'
  ) then
    alter table public.work_days
      add constraint work_days_store_date_unique unique (store_id, date);
  end if;
end $$;

-- =====================================================================
-- Тригер: при додаванні/зміні/видаленні авто автоматично перераховує
-- "revenue" і "cars_washed" у work_days для відповідної дати
-- =====================================================================
create or replace function public.sync_work_day_from_entries()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target_store uuid;
  target_date date;
  total_revenue numeric;
  total_cars integer;
begin
  if tg_op = 'DELETE' then
    target_store := old.store_id;
    target_date := old.entry_date;
  else
    target_store := new.store_id;
    target_date := new.entry_date;
  end if;

  select coalesce(sum(price), 0), count(*)
    into total_revenue, total_cars
  from public.car_entries
  where store_id = target_store and entry_date = target_date;

  insert into public.work_days (store_id, date, revenue, cars_washed)
  values (target_store, target_date, total_revenue, total_cars)
  on conflict (store_id, date)
  do update set revenue = excluded.revenue, cars_washed = excluded.cars_washed;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists car_entries_sync_work_day on public.car_entries;
create trigger car_entries_sync_work_day
  after insert or update or delete on public.car_entries
  for each row execute procedure public.sync_work_day_from_entries();

-- =====================================================================
-- RLS для нових таблиць
-- =====================================================================
alter table public.employees enable row level security;
alter table public.car_entries enable row level security;

create policy "select own employees" on public.employees
  for select using (store_id = public.current_store_id());
create policy "insert own employees" on public.employees
  for insert with check (store_id = public.current_store_id());
create policy "update own employees" on public.employees
  for update using (store_id = public.current_store_id());
create policy "delete own employees" on public.employees
  for delete using (store_id = public.current_store_id());

create policy "select own car_entries" on public.car_entries
  for select using (store_id = public.current_store_id());
create policy "insert own car_entries" on public.car_entries
  for insert with check (store_id = public.current_store_id());
create policy "update own car_entries" on public.car_entries
  for update using (store_id = public.current_store_id());
create policy "delete own car_entries" on public.car_entries
  for delete using (store_id = public.current_store_id());
