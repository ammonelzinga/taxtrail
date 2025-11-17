-- Enable RLS
alter table public.income enable row level security;
alter table public.expenses enable row level security;
alter table public.trips enable row level security;
alter table public.tax_settings enable row level security;

-- Policies: users can manage only their own rows
-- income
drop policy if exists income_select on public.income;
create policy income_select on public.income
  for select using (auth.uid() = user_id);

drop policy if exists income_insert on public.income;
create policy income_insert on public.income
  for insert with check (auth.uid() = user_id);

drop policy if exists income_update on public.income;
create policy income_update on public.income
  for update using (auth.uid() = user_id);

drop policy if exists income_delete on public.income;
create policy income_delete on public.income
  for delete using (auth.uid() = user_id);

-- expenses
drop policy if exists expenses_select on public.expenses;
create policy expenses_select on public.expenses
  for select using (auth.uid() = user_id);

drop policy if exists expenses_insert on public.expenses;
create policy expenses_insert on public.expenses
  for insert with check (auth.uid() = user_id);

drop policy if exists expenses_update on public.expenses;
create policy expenses_update on public.expenses
  for update using (auth.uid() = user_id);

drop policy if exists expenses_delete on public.expenses;
create policy expenses_delete on public.expenses
  for delete using (auth.uid() = user_id);

-- trips
drop policy if exists trips_select on public.trips;
create policy trips_select on public.trips
  for select using (auth.uid() = user_id);

drop policy if exists trips_insert on public.trips;
create policy trips_insert on public.trips
  for insert with check (auth.uid() = user_id);

drop policy if exists trips_update on public.trips;
create policy trips_update on public.trips
  for update using (auth.uid() = user_id);

drop policy if exists trips_delete on public.trips;
create policy trips_delete on public.trips
  for delete using (auth.uid() = user_id);

-- tax_settings
drop policy if exists tax_settings_select on public.tax_settings;
create policy tax_settings_select on public.tax_settings
  for select using (auth.uid() = user_id);

drop policy if exists tax_settings_insert on public.tax_settings;
create policy tax_settings_insert on public.tax_settings
  for insert with check (auth.uid() = user_id);

drop policy if exists tax_settings_update on public.tax_settings;
create policy tax_settings_update on public.tax_settings
  for update using (auth.uid() = user_id);

drop policy if exists tax_settings_delete on public.tax_settings;
create policy tax_settings_delete on public.tax_settings
  for delete using (auth.uid() = user_id);
