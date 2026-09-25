alter table public.patient_wound_media
  add column if not exists captured_at timestamptz;

create index if not exists patient_wound_media_captured_at_idx
  on public.patient_wound_media (patient_id, captured_at desc);
