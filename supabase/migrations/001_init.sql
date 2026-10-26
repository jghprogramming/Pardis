-- Building charge SaaS: initial schema (version 1)
-- Run this in Supabase SQL editor. Add Row Level Security policies
-- before production use: product owner sees all buildings,
-- building managers see only their own building,
-- residents see only their own unit's bills.

create table if not exists profiles (
  id uuid primary key,
  full_name text,
  role text not null check (role in ('product_owner', 'building_manager', 'resident')),
  phone text,
  created_at timestamptz default now()
);

create table if not exists plans (
  id bigint generated always as identity primary key,
  name text not null,
  monthly_price numeric not null,
  unit_cap integer not null default 0,
  features jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists buildings (
  id bigint generated always as identity primary key,
  name text not null,
  address text,
  manager_id uuid references profiles(id),
  plan_id bigint references plans(id),
  created_at timestamptz default now()
);

create table if not exists subscriptions (
  id bigint generated always as identity primary key,
  building_id bigint not null references buildings(id),
  plan_id bigint not null references plans(id),
  cycle text not null check (cycle in ('monthly', 'quarterly', 'semiannual', 'annual')),
  starts_at date not null,
  ends_at date not null,
  status text not null default 'active' check (status in ('active', 'suspended', 'expired')),
  created_at timestamptz default now()
);

create table if not exists subscription_invoices (
  id bigint generated always as identity primary key,
  subscription_id bigint not null references subscriptions(id),
  building_id bigint not null references buildings(id),
  amount numeric not null,
  status text not null default 'unpaid' check (status in ('paid', 'unpaid')),
  issued_at date not null,
  paid_at date
);

create table if not exists units (
  id bigint generated always as identity primary key,
  building_id bigint not null references buildings(id),
  unit_no text not null,
  area numeric not null,
  occupants integer not null default 1,
  resident_name text,
  resident_type text check (resident_type in ('owner', 'tenant')),
  phone text,
  created_at timestamptz default now()
);

create table if not exists charge_periods (
  id bigint generated always as identity primary key,
  building_id bigint not null references buildings(id),
  jalali_year integer not null,
  jalali_month integer not null,
  method text not null check (method in ('fixed', 'area', 'occupants', 'combined')),
  fixed_amount numeric not null default 0,
  per_sqm numeric not null default 0,
  per_person numeric not null default 0,
  special_costs numeric not null default 0,
  late_fee_percent numeric not null default 0,
  due_date date not null
);

create table if not exists bills (
  id bigint generated always as identity primary key,
  building_id bigint not null references buildings(id),
  period_id bigint not null references charge_periods(id),
  unit_id bigint not null references units(id),
  base_amount numeric not null,
  special_share numeric not null default 0,
  late_fee numeric not null default 0,
  paid_amount numeric not null default 0,
  total_due numeric not null,
  remaining numeric not null,
  status text not null default 'unpaid' check (status in ('paid', 'partial', 'unpaid', 'overdue'))
);

create table if not exists payments (
  id bigint generated always as identity primary key,
  building_id bigint not null references buildings(id),
  bill_id bigint references bills(id),
  unit_id bigint references units(id),
  amount numeric not null,
  method text not null check (method in ('online', 'card', 'cash')),
  ref_code text,
  created_at timestamptz default now()
);

create table if not exists expenses (
  id bigint generated always as identity primary key,
  building_id bigint not null references buildings(id),
  title text not null,
  category text,
  amount numeric not null,
  expense_date date not null
);
