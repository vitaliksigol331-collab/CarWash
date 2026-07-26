-- =====================================================================
-- МІГРАЦІЯ 6: Кілька працівників на одне авто
-- Виконай У Supabase Dashboard → SQL Editor → New query, ПІСЛЯ migration_05
-- =====================================================================

-- Таблиця-зв'язка: одне авто (car_entries) — кілька працівників
create table if not exists public.car_entry_employees (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  car_entry_id uuid not null references public.car_entries(id) on delete cascade,
  entry_date date not null,
  employee_id uuid references public.employees(id) on delete set null,
  employee_name_snapshot text,
  commission_percent_snapshot numeric(5,2) not null default 0,
  commission_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists car_entry_employees_car_entry_idx
  on public.car_entry_employees (car_entry_id);
create index if not exists car_entry_employees_store_date_idx
  on public.car_entry_employees (store_id, entry_date);
create index if not exists car_entry_employees_employee_idx
  on public.car_entry_employees (employee_id);

alter table public.car_entry_employees enable row level security;

create policy "select own car_entry_employees" on public.car_entry_employees
  for select using (store_id = public.current_store_id());
create policy "insert own car_entry_employees" on public.car_entry_employees
  for insert with check (store_id = public.current_store_id());
create policy "update own car_entry_employees" on public.car_entry_employees
  for update using (store_id = public.current_store_id());
create policy "delete own car_entry_employees" on public.car_entry_employees
  for delete using (store_id = public.current_store_id());

-- Переносимо старі записи (де був лише один працівник на авто) у нову таблицю,
-- щоб уся минула статистика й надалі рахувалась правильно
insert into public.car_entry_employees
  (store_id, car_entry_id, entry_date, employee_id, employee_name_snapshot, commission_percent_snapshot, commission_amount)
select store_id, id, entry_date, employee_id, employee_name_snapshot, commission_percent_snapshot, commission_amount
from public.car_entries
where employee_id is not null
  and not exists (
    select 1 from public.car_entry_employees cee where cee.car_entry_id = car_entries.id
  );
