create policy users_deny_api_access on public.users
  for all to anon, authenticated using (false) with check (false);
create policy diabetes_import_batches_deny_api_access on public.diabetes_import_batches
  for all to anon, authenticated using (false) with check (false);
create policy diabetes_patients_deny_api_access on public.diabetes_patients
  for all to anon, authenticated using (false) with check (false);
create policy diabetes_patient_observations_deny_api_access on public.diabetes_patient_observations
  for all to anon, authenticated using (false) with check (false);
