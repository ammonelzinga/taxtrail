-- Tables
create table if not exists public.income (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  amount numeric not null,
  date date not null,
  category text,
  notes text,
  created_at timestamp with time zone default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  amount numeric not null,
  date date not null,
  merchant text,
  business_pct numeric,
  category text,
  receipt_url text,
  created_at timestamp with time zone default now()
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  started_at timestamp with time zone not null,
  ended_at timestamp with time zone not null,
  distance_miles numeric not null,
  route_polyline text,
  start_address text,
  end_address text,
  purpose text,
  created_at timestamp with time zone default now()
);

create table if not exists public.tax_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  filing_status text not null,
  state text,
  estimated_annual_income numeric,
  other_deductions numeric,
  safe_harbor text,
  created_at timestamp with time zone default now()
);

-- Indexes
create index if not exists income_user_id_idx on public.income(user_id);
create index if not exists expenses_user_id_idx on public.expenses(user_id);
create index if not exists trips_user_id_idx on public.trips(user_id);
create index if not exists tax_settings_user_id_idx on public.tax_settings(user_id);
