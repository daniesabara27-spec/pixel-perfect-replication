create policy "kcc files read" on storage.objects for select to authenticated
  using (bucket_id in ('foto','laporan','instruksi-kerja'));
create policy "kcc files insert" on storage.objects for insert to authenticated
  with check (bucket_id in ('foto','laporan','instruksi-kerja'));
create policy "kcc files update staff" on storage.objects for update to authenticated
  using (bucket_id in ('foto','laporan','instruksi-kerja') and public.is_staff(auth.uid()));
create policy "kcc files delete staff" on storage.objects for delete to authenticated
  using (bucket_id in ('foto','laporan','instruksi-kerja') and public.is_staff(auth.uid()));
