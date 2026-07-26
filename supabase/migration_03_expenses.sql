-- =====================================================================
-- МІГРАЦІЯ 3: Витрати з категоріями
-- Виконай У Supabase Dashboard → SQL Editor → New query, ПІСЛЯ migration_02
-- Доповнення, нічого не видаляє.
-- =====================================================================

create table if not exists public.expense_entries (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  category text not null,
  amount numeric(12,2) not null default 0,
  note text,
  expense_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists expense_entries_store_date_idx
  on public.expense_entries (store_id, expense_date);

alter table public.expense_entries enable row level security;

create policy "select own expense_entries" on public.expense_entries
  for select using (store_id = public.current_store_id());
create policy "insert own expense_entries" on public.expense_entries
  for insert with check (store_id = public.current_store_id());
create policy "update own expense_entries" on public.expense_entries
  for update using (store_id = public.current_store_id());
create policy "delete own expense_entries" on public.expense_entries
  for delete using (store_id = public.current_store_id());
