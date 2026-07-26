-- =====================================================================
-- AquaBoard — схема бази даних для Supabase
-- Виконай цей файл повністю в Supabase Dashboard → SQL Editor → New query
-- =====================================================================

-- 1. Таблиця "stores" — кожна автомийка (робочий простір)
create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- 2. Таблиця "profiles" — зв'язок auth-користувача з його мийкою
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

-- 3. Робочі дні (зміни)
create table if not exists public.work_days (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  date date not null,
  revenue numeric(12,2) not null default 0,
  cars_washed integer not null default 0,
  expenses numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

-- 4. Склад
create table if not exists public.warehouse_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  quantity numeric(12,2) not null default 0,
  unit text not null default 'шт',
  min_threshold numeric(12,2) not null default 0,
  price numeric(12,2),
  created_at timestamptz not null default now()
);

-- 5. Клієнти
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  phone text,
  car_model text,
  visits_count integer not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

-- 6. Записи (бронювання)
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  client_name text not null,
  phone text,
  service text,
  booking_date date not null,
  booking_time time not null,
  status text not null default 'заплановано',
  created_at timestamptz not null default now()
);

-- =====================================================================
-- Тригер: при реєстрації нового користувача автоматично створює
-- запис у "stores" (з назвою, яку ввели при реєстрації) і "profiles"
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_store_id uuid;
begin
  insert into public.stores (owner_id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'store_name', 'Моя автомийка'))
  returning id into new_store_id;

  insert into public.profiles (id, store_id, email)
  values (new.id, new_store_id, new.email);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================================================================
-- Row Level Security: кожен власник бачить і редагує лише дані СВОЄЇ мийки
-- =====================================================================
alter table public.stores enable row level security;
alter table public.profiles enable row level security;
alter table public.work_days enable row level security;
alter table public.warehouse_items enable row level security;
alter table public.clients enable row level security;
alter table public.bookings enable row level security;

-- Допоміжна функція: store_id поточного користувача
create or replace function public.current_store_id()
returns uuid
language sql
security definer set search_path = public
stable
as $$
  select store_id from public.profiles where id = auth.uid();
$$;

-- stores
create policy "Власник бачить свою мийку" on public.stores
  for select using (owner_id = auth.uid());

-- profiles
create policy "Користувач бачить свій профіль" on public.profiles
  for select using (id = auth.uid());

-- work_days
create policy "select own work_days" on public.work_days
  for select using (store_id = public.current_store_id());
create policy "insert own work_days" on public.work_days
  for insert with check (store_id = public.current_store_id());
create policy "update own work_days" on public.work_days
  for update using (store_id = public.current_store_id());
create policy "delete own work_days" on public.work_days
  for delete using (store_id = public.current_store_id());

-- warehouse_items
create policy "select own warehouse_items" on public.warehouse_items
  for select using (store_id = public.current_store_id());
create policy "insert own warehouse_items" on public.warehouse_items
  for insert with check (store_id = public.current_store_id());
create policy "update own warehouse_items" on public.warehouse_items
  for update using (store_id = public.current_store_id());
create policy "delete own warehouse_items" on public.warehouse_items
  for delete using (store_id = public.current_store_id());

-- clients
create policy "select own clients" on public.clients
  for select using (store_id = public.current_store_id());
create policy "insert own clients" on public.clients
  for insert with check (store_id = public.current_store_id());
create policy "update own clients" on public.clients
  for update using (store_id = public.current_store_id());
create policy "delete own clients" on public.clients
  for delete using (store_id = public.current_store_id());

-- bookings
create policy "select own bookings" on public.bookings
  for select using (store_id = public.current_store_id());
create policy "insert own bookings" on public.bookings
  for insert with check (store_id = public.current_store_id());
create policy "update own bookings" on public.bookings
  for update using (store_id = public.current_store_id());
create policy "delete own bookings" on public.bookings
  for delete using (store_id = public.current_store_id());
