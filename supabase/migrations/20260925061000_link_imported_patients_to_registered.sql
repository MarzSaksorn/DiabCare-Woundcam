alter table public.registered_patients
  drop constraint if exists registered_patients_diabetes_context_check;

alter table public.registered_patients
  add column if not exists imported_patient_id bigint references public.diabetes_patients(id) on delete restrict;

create unique index if not exists registered_patients_imported_patient_uidx
  on public.registered_patients (imported_patient_id)
  where imported_patient_id is not null;

insert into public.registered_patients (
  patient_code,
  display_name,
  date_of_birth,
  age,
  registration_location,
  identify_by,
  type1,
  type2,
  gdm,
  sex,
  clinical_notes,
  imported_patient_id,
  created_at,
  updated_at
)
select
  'IMPORTED-' || lpad((p.source_row_number - 1)::text, 3, '0'),
  null,
  null,
  case when p.age ~ '^[0-9]+$' then p.age::integer else null end,
  'Imported baseline',
  p.identify_by,
  p.type1,
  p.type2,
  p.gdm,
  p.sex,
  'Editable record linked to the source-preserved imported baseline. Review imported observations before clinical use.',
  p.id,
  p.created_at,
  p.created_at
from public.diabetes_patients p
where not exists (
  select 1 from public.registered_patients r where r.imported_patient_id = p.id
);

comment on column public.registered_patients.imported_patient_id is 'Source-preserving link to an imported diabetes_patients row. Editable profile fields live on this registered record; imported observations remain unchanged.';
