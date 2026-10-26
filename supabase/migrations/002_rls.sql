-- Building charge SaaS: Row Level Security (version 2)
-- Run AFTER supabase/migrations/001_init.sql, BEFORE any real data is used.
-- This file is a draft to review, not yet applied: no Supabase project
-- exists yet, so nothing here has run against a live database.
--
-- Why this migration exists:
-- 001 created the tables but no policies, so with RLS off (or with no
-- policies at all) an authenticated client could read other buildings'
-- data. After this file, the database itself enforces the three roles
-- the user approved: product owner sees all, building manager sees only
-- their own building (and can delete its records), resident sees only
-- their own unit's bills and their own building's expenses.
--
-- Gap found in 001 and fixed here:
-- 001's `units` table had resident_name / phone but no link to a
-- resident's auth user, so "resident sees only their own bills" could
-- not be enforced at all. This migration adds
-- units.resident_id (references profiles.id). When a resident account
-- is created, set that column to the resident's auth user id; until
-- then, that unit's bills are visible to nobody except the product
-- owner and that building's manager.
--
-- First product owner (important, read before testing):
-- A user signing up through the app may NOT create themselves as
-- product_owner: the insert policy below blocks role = 'product_owner'
-- for self-registration, otherwise anyone could promote themselves.
-- Create the first product_owner profile from the Supabase SQL editor
-- (which bypasses RLS) or with the service-role key, e.g. after that
-- user signs up:
--   update profiles set role = 'product_owner' where id = '<auth user id>';
-- After that, the product owner can create / promote other accounts
-- through policies, and the app must never use the service-role key
-- in browser code (see src/lib/supabase.ts).
--
-- Roles are read through a SECURITY DEFINER helper so policies on
-- `profiles` do not recurse into themselves: the helper bypasses RLS
-- and only returns the caller's own role.

-- ---------------------------------------------------------------- helper

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

revoke all on function public.current_user_role() from public;
grant execute on function public.current_user_role() to authenticated;

-- ------------------------------------------------------- schema addition

alter table if exists units
  add column if not exists resident_id uuid references profiles(id);

create index if not exists units_resident_id_idx on units (resident_id);
create index if not exists buildings_manager_id_idx on buildings (manager_id);
create index if not exists bills_unit_id_idx on bills (unit_id);

-- ------------------------------------------------------------ enable RLS

alter table profiles enable row level security;
alter table plans enable row level security;
alter table buildings enable row level security;
alter table subscriptions enable row level security;
alter table subscription_invoices enable row level security;
alter table units enable row level security;
alter table charge_periods enable row level security;
alter table bills enable row level security;
alter table payments enable row level security;
alter table expenses enable row level security;

-- --------------------------------------------------------------- profiles
-- A user reads / edits their own row. The product owner reads and
-- manages all rows. Self-registration can never claim product_owner.

create policy profiles_select_own_or_owner on profiles
  for select to authenticated
  using (id = auth.uid() or public.current_user_role() = 'product_owner');

create policy profiles_insert_own on profiles
  for insert to authenticated
  with check (id = auth.uid() and role <> 'product_owner');

create policy profiles_insert_owner on profiles
  for insert to authenticated
  with check (public.current_user_role() = 'product_owner');

create policy profiles_update_own on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role <> 'product_owner');

create policy profiles_update_owner on profiles
  for update to authenticated
  using (public.current_user_role() = 'product_owner')
  with check (public.current_user_role() = 'product_owner');

-- ------------------------------------------------------------------ plans
-- Everyone authenticated may read active plans (a building manager
-- needs to see the plan on their building); only the product owner
-- creates, changes or deactivates plans.

create policy plans_select_active on plans
  for select to authenticated
  using (active = true);

create policy plans_owner_all on plans
  for all to authenticated
  using (public.current_user_role() = 'product_owner')
  with check (public.current_user_role() = 'product_owner');

-- -------------------------------------------------------------- buildings

create policy buildings_owner_all on buildings
  for all to authenticated
  using (public.current_user_role() = 'product_owner')
  with check (public.current_user_role() = 'product_owner');

create policy buildings_manager_select on buildings
  for select to authenticated
  using (manager_id = auth.uid());

create policy buildings_manager_update on buildings
  for update to authenticated
  using (manager_id = auth.uid())
  with check (manager_id = auth.uid());

create policy buildings_manager_delete on buildings
  for delete to authenticated
  using (manager_id = auth.uid());

create policy buildings_resident_select on buildings
  for select to authenticated
  using (exists (
    select 1 from units u
    where u.building_id = buildings.id and u.resident_id = auth.uid()
  ));

-- ----------------------------------------------------------- subscriptions
-- Subscription state is a product-owner / building-manager matter:
-- residents get no access here.

create policy subscriptions_owner_all on subscriptions
  for all to authenticated
  using (public.current_user_role() = 'product_owner')
  with check (public.current_user_role() = 'product_owner');

create policy subscriptions_manager_select on subscriptions
  for select to authenticated
  using (exists (
    select 1 from buildings b
    where b.id = subscriptions.building_id and b.manager_id = auth.uid()
  ));

create policy subscription_invoices_owner_all on subscription_invoices
  for all to authenticated
  using (public.current_user_role() = 'product_owner')
  with check (public.current_user_role() = 'product_owner');

create policy subscription_invoices_manager_select on subscription_invoices
  for select to authenticated
  using (exists (
    select 1 from buildings b
    where b.id = subscription_invoices.building_id and b.manager_id = auth.uid()
  ));

-- ------------------------------------------------------------------- units

create policy units_owner_all on units
  for all to authenticated
  using (public.current_user_role() = 'product_owner')
  with check (public.current_user_role() = 'product_owner');

create policy units_manager_select on units
  for select to authenticated
  using (exists (
    select 1 from buildings b
    where b.id = units.building_id and b.manager_id = auth.uid()
  ));

create policy units_manager_write on units
  for insert to authenticated
  with check (exists (
    select 1 from buildings b
    where b.id = units.building_id and b.manager_id = auth.uid()
  ));

create policy units_manager_update on units
  for update to authenticated
  using (exists (
    select 1 from buildings b
    where b.id = units.building_id and b.manager_id = auth.uid()
  ))
  with check (exists (
    select 1 from buildings b
    where b.id = units.building_id and b.manager_id = auth.uid()
  ));

create policy units_manager_delete on units
  for delete to authenticated
  using (exists (
    select 1 from buildings b
    where b.id = units.building_id and b.manager_id = auth.uid()
  ));

create policy units_resident_select on units
  for select to authenticated
  using (resident_id = auth.uid());

-- ---------------------------------------------------------- charge_periods

create policy charge_periods_owner_all on charge_periods
  for all to authenticated
  using (public.current_user_role() = 'product_owner')
  with check (public.current_user_role() = 'product_owner');

create policy charge_periods_manager_select on charge_periods
  for select to authenticated
  using (exists (
    select 1 from buildings b
    where b.id = charge_periods.building_id and b.manager_id = auth.uid()
  ));

create policy charge_periods_manager_write on charge_periods
  for insert to authenticated
  with check (exists (
    select 1 from buildings b
    where b.id = charge_periods.building_id and b.manager_id = auth.uid()
  ));

create policy charge_periods_manager_update on charge_periods
  for update to authenticated
  using (exists (
    select 1 from buildings b
    where b.id = charge_periods.building_id and b.manager_id = auth.uid()
  ))
  with check (exists (
    select 1 from buildings b
    where b.id = charge_periods.building_id and b.manager_id = auth.uid()
  ));

create policy charge_periods_manager_delete on charge_periods
  for delete to authenticated
  using (exists (
    select 1 from buildings b
    where b.id = charge_periods.building_id and b.manager_id = auth.uid()
  ));

create policy charge_periods_resident_select on charge_periods
  for select to authenticated
  using (exists (
    select 1 from units u
    where u.building_id = charge_periods.building_id and u.resident_id = auth.uid()
  ));

-- -------------------------------------------------------------------- bills
-- This is the resident's core rule: a resident reads only bills whose
-- unit is linked to their own auth user id.

create policy bills_owner_all on bills
  for all to authenticated
  using (public.current_user_role() = 'product_owner')
  with check (public.current_user_role() = 'product_owner');

create policy bills_manager_select on bills
  for select to authenticated
  using (exists (
    select 1 from buildings b
    where b.id = bills.building_id and b.manager_id = auth.uid()
  ));

create policy bills_manager_write on bills
  for insert to authenticated
  with check (exists (
    select 1 from buildings b
    where b.id = bills.building_id and b.manager_id = auth.uid()
  ));

create policy bills_manager_update on bills
  for update to authenticated
  using (exists (
    select 1 from buildings b
    where b.id = bills.building_id and b.manager_id = auth.uid()
  ))
  with check (exists (
    select 1 from buildings b
    where b.id = bills.building_id and b.manager_id = auth.uid()
  ));

create policy bills_manager_delete on bills
  for delete to authenticated
  using (exists (
    select 1 from buildings b
    where b.id = bills.building_id and b.manager_id = auth.uid()
  ));

create policy bills_resident_select on bills
  for select to authenticated
  using (exists (
    select 1 from units u
    where u.id = bills.unit_id and u.resident_id = auth.uid()
  ));

-- ----------------------------------------------------------------- payments

create policy payments_owner_all on payments
  for all to authenticated
  using (public.current_user_role() = 'product_owner')
  with check (public.current_user_role() = 'product_owner');

create policy payments_manager_select on payments
  for select to authenticated
  using (exists (
    select 1 from buildings b
    where b.id = payments.building_id and b.manager_id = auth.uid()
  ));

create policy payments_manager_write on payments
  for insert to authenticated
  with check (exists (
    select 1 from buildings b
    where b.id = payments.building_id and b.manager_id = auth.uid()
  ));

create policy payments_manager_delete on payments
  for delete to authenticated
  using (exists (
    select 1 from buildings b
    where b.id = payments.building_id and b.manager_id = auth.uid()
  ));

create policy payments_resident_select on payments
  for select to authenticated
  using (
    exists (
      select 1 from units u
      where u.id = payments.unit_id and u.resident_id = auth.uid()
    )
    or exists (
      select 1 from bills bl
      join units u on u.id = bl.unit_id
      where bl.id = payments.bill_id and u.resident_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------- expenses
-- Confirmed by the user on 2026-10-26: residents CAN see their own
-- building's expenses / fund items (read-only). Building managers can
-- also delete their own building's expenses (see below).

create policy expenses_owner_all on expenses
  for all to authenticated
  using (public.current_user_role() = 'product_owner')
  with check (public.current_user_role() = 'product_owner');

create policy expenses_manager_select on expenses
  for select to authenticated
  using (exists (
    select 1 from buildings b
    where b.id = expenses.building_id and b.manager_id = auth.uid()
  ));

create policy expenses_manager_write on expenses
  for insert to authenticated
  with check (exists (
    select 1 from buildings b
    where b.id = expenses.building_id and b.manager_id = auth.uid()
  ));

create policy expenses_manager_update on expenses
  for update to authenticated
  using (exists (
    select 1 from buildings b
    where b.id = expenses.building_id and b.manager_id = auth.uid()
  ))
  with check (exists (
    select 1 from buildings b
    where b.id = expenses.building_id and b.manager_id = auth.uid()
  ));

create policy expenses_manager_delete on expenses
  for delete to authenticated
  using (exists (
    select 1 from buildings b
    where b.id = expenses.building_id and b.manager_id = auth.uid()
  ));

create policy expenses_resident_select on expenses
  for select to authenticated
  using (exists (
    select 1 from units u
    where u.building_id = expenses.building_id and u.resident_id = auth.uid()
  ));
