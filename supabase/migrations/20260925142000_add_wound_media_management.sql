alter table public.patient_wound_media
  add column if not exists hidden_at timestamptz,
  add column if not exists hidden_by_user_id bigint references public.users(id) on delete set null,
  add column if not exists hidden_reason varchar(500);

create index if not exists patient_wound_media_visible_idx
  on public.patient_wound_media (patient_id, captured_at desc)
  where hidden_at is null;

comment on column public.patient_wound_media.hidden_at is 'Reversible visibility state. Hidden images remain auditable until explicitly deleted.';
comment on column public.patient_wound_media.hidden_reason is 'Clinician-entered reason for hiding an image.';
