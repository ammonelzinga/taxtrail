-- Buckets: receipts (public), forms (private or public)
-- Create buckets in Supabase UI or SQL if needed:
-- select storage.create_bucket('receipts', public => true);
-- select storage.create_bucket('forms', public => false);

-- Policies for receipts (PRIVATE): only owner can read/write/delete their folder
drop policy if exists receipts_read on storage.objects;
create policy receipts_read on storage.objects
  for select to authenticated using (
    bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists receipts_insert on storage.objects;
create policy receipts_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists receipts_update on storage.objects;
create policy receipts_update on storage.objects
  for update to authenticated using (
    bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists receipts_delete on storage.objects;
create policy receipts_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policies for forms (private read/write for owner)
drop policy if exists forms_select on storage.objects;
create policy forms_select on storage.objects
  for select to authenticated using (
    bucket_id = 'forms' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists forms_insert on storage.objects;
create policy forms_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'forms' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists forms_update on storage.objects;
create policy forms_update on storage.objects
  for update to authenticated using (
    bucket_id = 'forms' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists forms_delete on storage.objects;
create policy forms_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'forms' and (storage.foldername(name))[1] = auth.uid()::text
  );
