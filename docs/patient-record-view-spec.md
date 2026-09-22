# DiabCare Woundcam Patient-Record View Specification

**Status:** Implementation-ready design specification  
**Product:** DiabCare Woundcam  
**Audience:** Local village nurses and the clinical teams who supervise their work  
**Target platform:** Existing responsive React, TypeScript, tRPC, Drizzle, and MySQL/TiDB web application  
**Data posture:** Sensitive health information; local-data-residency requirement  
**Author:** Manus AI

## 1. Decision summary

The patient-record view should be a clinician workspace rather than a static profile page. Its primary job is to help a village nurse answer four questions quickly:

1. **Who is this patient, and what requires attention now?**
2. **What has changed in the patient's clinical observations?**
3. **How is each wound changing across assessments?**
4. **What was recorded, by whom, when, and from which source?**

The view should use a persistent patient context header, a tabbed or segmented clinical workspace, and a synchronized timeline. The default page should show the latest safe summary without declaring a diagnosis. Every alert must be framed as a review prompt that links to the underlying observations.

The imported workbook currently provides a de-identified diabetes cohort with baseline fields and periodized clinical measurements. It does **not** provide a patient name, contact information, stable external identifier, wound record, wound image, treatment plan, or clinician-authored note. Those items must therefore be represented as missing or proposed future entities, not fabricated values.

> **Clinical safety boundary:** DiabCare Woundcam presents recorded observations, changes, and configurable review flags. It does not diagnose infection, determine wound stage, recommend treatment, or replace local clinical protocols and clinician judgment.

## 2. Inputs, assumptions, and protected contracts

### 2.1 Supplied inputs

The supplied requirements establish that the main users are local village nurses, the application should use the current stack, the design should be based on the current data, and data should remain within the local residency boundary.

The current database contains the following relevant structures:

- `users` for authentication and application roles.
- `diabetesImportBatches` for workbook provenance and import idempotency.
- `diabetesPatients` for the imported baseline fields.
- `diabetesPatientObservations` for non-null source observations, including periodized vital signs, laboratory values, comorbidity fields, and medication indicators.

The current wound dashboard also contains a demonstration-only wound workflow. Its example patients and wound timeline must not be treated as production records.

### 2.2 Assumptions used because details were not supplied

| Area | Assumption | Product consequence |
|---|---|---|
| Roles | Village nurses perform routine review and entry. A supervising clinician can review, correct, and sign off. An administrator manages access and configuration. | Use role-based read/write controls and a visible author/audit trail. |
| Patient identity | The workbook is de-identified. `sourceRowNumber` and internal database IDs are technical references, not patient identifiers. | Do not display a fabricated name or national ID. Add an explicit “Imported cohort record” label until a governed identity-linking workflow exists. |
| Clinical data | Workbook fields are baseline and periodized observations. Wound data is a separate future domain. | Keep diabetes observations and wound observations related through a patient record, but do not flatten them into one untyped field. |
| Platform | Use the current React + TypeScript + tRPC + Drizzle + MySQL/TiDB application. | Keep server access behind protected tRPC procedures and use typed shared contracts. |
| Residency | Database, object storage, backups, logs, and audit records must remain in the approved local residency boundary. | Disable unapproved external analytics, third-party image processing, and external AI inference for protected data. |
| Regulation | No specific jurisdiction was provided. | Use a privacy-by-design baseline and require local legal/compliance review before production use. |
| Clinical protocol | No hospital-specific wound protocol or threshold set was supplied. | Show configurable review flags only. Do not hard-code diagnostic thresholds as clinical truth. |

These assumptions are implementation defaults, not clinical policy. They should be replaced by a hospital-approved configuration before production deployment.

## 3. Intended users and authorization model

The application should use least-privilege access. Role names may be mapped to the current `users.role` model initially, but production deployment should support a scoped permission model because a single `admin`/`user` distinction is insufficient for clinical records.

| Role | View patient record | Enter observation | Edit own draft | Correct signed record | Export | Manage access/configuration |
|---|---:|---:|---:|---:|---:|---:|
| Village nurse | Assigned patients | Yes | Yes | No | Limited, audited | No |
| Supervising clinician | Assigned and referred patients | Yes | Yes | Yes with reason | Yes, audited | No |
| Clinical administrator | As configured | Optional | Optional | With reason | Yes, audited | Yes |
| Support/auditor | Metadata and audit only by default | No | No | No | Restricted | No |

The patient view must show the current viewer's role and the scope that granted access. A user should not infer that seeing a record means they may edit it.

## 4. Page anatomy and responsive layout

### 4.1 Desktop layout

Use the existing DiabCare left navigation. The patient page should use a wide content area with the following order:

1. **Context bar:** back to patient list, breadcrumb, record status, last refresh, and access scope.
2. **Patient summary header:** identity state, demographics, diagnoses, allergies, risk flags, care team, and latest status.
3. **Review strip:** open alerts, incomplete data, last assessment, next planned review, and record provenance.
4. **Clinical workspace:** segmented navigation for `Overview`, `Observations`, `Wounds`, `Timeline`, and `Audit trail`.
5. **Primary content:** the selected section with a consistent date-range filter.
6. **Right-side detail rail on large screens:** selected observation, wound assessment, or media preview. On small screens this becomes a drawer.

### 4.2 Mobile and low-bandwidth layout

The page should collapse into a single column. The header should retain only the patient record label, current status, one high-priority flag, and an accessible menu. Tabs should be horizontally scrollable or rendered as a select control. Tables should become stacked cards with explicit labels. Images should use low-resolution previews first and load the original only after user intent.

Avoid relying on hover. All drill-downs must be reachable by keyboard and touch. The page should remain usable when observation values or media are unavailable.

### 4.3 Suggested information hierarchy

Use a restrained status palette:

- **Neutral:** recorded, stable, or informational.
- **Amber:** review due, incomplete, or requires confirmation.
- **Terracotta:** configured review priority or worsening trend.
- **Sage:** improving or complete.

The color is never the only signal. Every status must include text and, where appropriate, an icon with an accessible label.

## 5. Patient summary header

The header should identify the record without exposing more identity than the viewer is authorized to see.

### 5.1 Identity block

Required fields:

- Display name if an approved identity source exists. Otherwise show `Imported cohort record #N`.
- Internal patient-record ID, visible only where operationally useful.
- External identifier, masked by default, if one is later linked through an approved identity workflow.
- Record state: `Imported`, `Active`, `Archived`, or `Needs identity link`.
- Source batch and source row, available in provenance or audit views rather than as the primary headline.
- Last updated timestamp in the user's local time with an explicit timezone label.

Never use a source row number as if it were a human identity.

### 5.2 Demographics and baseline context

Display only fields available to the viewer and present in the record:

- Age or age band, subject to local privacy policy.
- Sex as recorded.
- Diabetes type indicators: type 1, type 2, and gestational diabetes indicator.
- Diabetes identification method.
- Diabetes onset field exactly as sourced, with its unit and interpretation documented.
- Relevant comorbidities if a governed mapping exists.

The current workbook declares `age` as an object and stores it as text. The UI must not silently calculate an exact birth date or infer age from another field.

### 5.3 Allergies and diagnoses

These sections should be present in the design but show a safe empty state until governed source fields exist:

- Allergies: `No allergy record available` is different from `No known allergies`.
- Diagnoses: list recorded diagnoses with source and date. Do not infer diagnoses from medication or lab values.
- Medication indicators: display as observations or medication history only when the source meaning is explicit. A medication indicator is not proof of a diagnosis or current adherence.

### 5.4 Risk and status block

Risk flags are review prompts derived from configured rules. Each flag must show:

- Flag label.
- Severity or priority, such as `P1`, `P2`, or `P3`, if the hospital defines these levels.
- Triggering observation or missing data condition.
- Trigger timestamp.
- Acknowledge or resolve state.
- Reviewer and review note.
- Link to the evidence.

Use labels such as `Possible worsening measurement — review source observations` rather than `Worsening disease` or `Infection diagnosed`.

### 5.5 Care team

Show assigned village nurse, supervising clinician, clinic, and referral destination where available. Each assignment should include effective dates and a source. If no assignment exists, show `Care team not assigned` with a controlled action for authorized staff.

### 5.6 Latest clinical status

This is a compact summary of the latest recorded observation and latest wound assessment. It should show:

- Date and time.
- Author and role.
- Source type.
- Completion state.
- Latest measured wound status, if a wound exists.
- A link to open the underlying record.

The summary must not present a computed status as a diagnosis.

## 6. Clinical-observations area

The observation area should support both a scannable table and a detail drawer. It should work for baseline records, periodized workbook fields, manually entered clinical observations, and future imported sources.

### 6.1 Observation list columns

| Column | Required behavior |
|---|---|
| Observation type | Human-readable label plus source field name on demand. |
| Value | Preserve source precision. Show text and numeric values separately. |
| Unit | Use the data dictionary unit. Show `Unit not provided` when absent. |
| Reference range or severity | Show only when a governed range exists. Never invent one. |
| Date/time | Show event time and timezone. For periodized imported fields, show the period key and its dictionary explanation. |
| Author | Name or role according to access policy. Imported records show source batch, not a fabricated author. |
| Source | Workbook, manual entry, device, or document. |
| Clinical note | Truncated in the list, fully visible in the detail view. |
| Media/documents | Count and type badges; never auto-open protected media. |
| Status | Recorded, amended, incomplete, conflicting, or review required. |

### 6.2 Filters and sorting

Provide filters for:

- Observation category: vital sign, lab, medication indicator, comorbidity, wound-related observation, or other configured categories.
- Source field and source batch.
- Event date/time range.
- Author or care team.
- Status and flag state.
- Presence of a note or attachment.
- Only changed values.

Default sorting should be newest event first, then highest review priority. A user must be able to return to the default sort with one action.

### 6.3 Observation detail drawer

Opening an observation should show the full immutable source record and its history:

- Observation ID.
- Type, source field, and dictionary description.
- Value, unit, precision, and reference range if governed.
- Event date/time and recorded date/time.
- Author, role, and care team.
- Source system or import batch.
- Clinical note.
- Related wound, treatment, media, and timeline events.
- Flag triggers and review status.
- Amendment history.
- Export or copy action subject to role permission.

The drawer should include a visible label when the value is imported and has not been clinically verified.

### 6.4 Conflicting observations

When two observations represent the same clinical concept and event window but disagree, do not silently choose one. Show a `Conflicting observations` state with:

- Both values.
- Source and author for each.
- Event timestamps.
- Which value is marked current, if a clinician has explicitly selected one.
- A review action requiring a reason.

## 7. Wound-progress workspace

The wound area must support multiple wounds for one patient. A patient record should never assume that one patient has only one wound.

### 7.1 Wound selector

The top of the wound section should show one card per wound with:

- Wound label generated from a governed location field, such as `Left plantar foot`, only when recorded.
- Wound ID.
- Current classification as recorded.
- Current status: active, healing, resolved, or unknown.
- Latest assessment date.
- Latest dimensions.
- Trend direction based on selected measurement and configured comparison method.
- Open flags.

If no wound exists, show `No wound record available` rather than `No wounds`.

### 7.2 Wound assessment form and detail view

Each assessment must support the following fields:

| Group | Fields |
|---|---|
| Location | Body site, side, anatomical detail, optional body-map reference. |
| Classification | Classification system name, class/stage, and source. Never show a stage without identifying the system. |
| Dimensions | Length, width, depth, units, measurement method, and measurement position. |
| Calculated metrics | Area or volume only when the calculation method and required dimensions are available. Mark calculated values as calculated. |
| Tissue | Granulation, slough, eschar, epithelialization, or other configured descriptors. Use controlled values plus a free-text note when appropriate. |
| Drainage | Amount, color, consistency, and source of the observation. |
| Odor | Recorded presence or intensity only if the local protocol defines the scale. |
| Pain | Score, scale name, timing, and patient-reported or observed source. |
| Infection indicators | Recorded signs or symptoms, not a diagnosis. Include a link to the protocol or review rule that generated a flag. |
| Treatment plan | Treatment recorded, owner, planned frequency, start date, and next review date. Do not generate treatment recommendations. |
| Notes | Clinician-authored observation and context. |
| Media | Photograph or document attachments, captured date/time, device/source, and consent/access state. |
| Assessment metadata | Assessment date/time, author, role, location, and completion/sign-off state. |

### 7.3 Wound measurement model

A measurement must retain the raw values and method. The system should not overwrite previous values. Suggested fields include:

- `length`, `width`, and `depth`.
- `unit`.
- `method`, such as ruler, probe, device, or estimated.
- `area` and `volume` only when calculated from available dimensions.
- `calculationMethod`, including version if the hospital defines one.
- `measuredAt` and `recordedAt`.
- `measuredBy`.
- `qualityState`, such as complete, partial, estimated, or conflicting.

If width or depth is absent, area or volume should show `Not calculated` rather than zero.

### 7.4 Wound photographs

Show a thumbnail grid with:

- Captured date/time.
- Wound ID and assessment association.
- Photographer or source.
- Image quality or completeness state.
- Consent/access state.
- Comparison selection control.

Do not expose original files in list responses. Use short-lived authorized URLs or a local media proxy. The application must not send wound photographs to external image-processing services unless that service has been explicitly approved for the residency and privacy boundary.

## 8. Timeline and comparison experience

The timeline is the cross-domain navigation layer. It should unify observations, wound assessments, treatments, notes, media, alerts, and amendments without hiding the original entity type.

### 8.1 Date controls

Provide:

- Custom start and end date.
- Past week.
- Past month.
- Past quarter.
- Full treatment history.
- Clear filter.
- Timezone label.

All date filters must use event time for clinical sequence and display recorded time when it differs. Imported period keys should be explained in a tooltip or metadata panel rather than converted into fabricated calendar dates.

### 8.2 Timeline event card

Each event should show the event type, date/time, short summary, author/source, status, and a drill-down affordance. Events should be visually grouped by wound where possible, but a global view must remain available.

### 8.3 Comparison mode

A user should be able to select two or more wound assessments or observations and compare them. The comparison view should show:

- Values side by side.
- Absolute change.
- Percentage change only when the denominator is valid and the calculation is documented.
- Time between assessments.
- Measurement method for each value.
- Author and source for each value.
- A plain-language trend label such as `increased`, `decreased`, `unchanged`, or `not comparable`.
- A warning when methods, units, wound IDs, or time windows differ.

The comparison engine must not label a change as clinically better or worse unless the hospital has configured and approved that interpretation.

## 9. Healing visualizations

### 9.1 Primary chart

Use a multi-series line chart for selected wound measurements. Allow the user to toggle length, width, depth, area, and volume. Each series must display its unit and calculation status.

The chart should include:

- Assessment points, not interpolated values presented as measurements.
- Tooltips with exact value, unit, date/time, author, and method.
- Missing-value gaps rather than a misleading zero line.
- A visible marker for assessment notes or treatment changes.
- A review flag marker linked to the underlying event.
- Accessible data table alternative.

### 9.2 Trend cards

Show compact cards for:

- Latest value.
- Previous comparable value.
- Absolute change.
- Percentage change, if valid.
- Days between assessments.
- Comparison status: comparable, limited, or not comparable.

Use neutral wording by default. For example, `Length increased by 0.4 cm since the previous comparable assessment` is safer than `Wound worsened`.

### 9.3 Data-quality treatment

The chart must distinguish:

- Recorded value.
- Estimated value.
- Calculated value.
- Missing value.
- Conflicting value.
- Value outside a configured review range.

No chart should draw a line across a missing interval unless that interpolation is explicitly labeled as a visual estimate and is not used for clinical flags.

## 10. Alerts and decision-support flags

Alerts are review tasks, not diagnoses. They must always link to evidence and show the rule version that created them.

### 10.1 Initial configurable flag types

| Flag | Trigger source | Safe presentation |
|---|---|---|
| Worsening measurement | Comparable measurement crosses an approved change threshold | `Measurement change requires clinical review` |
| Possible infection indicator | Recorded signs or symptoms match a configured review rule | `Recorded infection indicator — follow local protocol` |
| Missed assessment | Expected assessment date passes without a completed record | `Assessment overdue` |
| Incomplete assessment | Required local fields are missing | `Assessment incomplete` |
| Conflicting observation | Same concept and event window has conflicting values | `Conflicting observations require review` |
| Unverified import | Imported baseline record has not been clinically confirmed | `Imported source data not clinically verified` |
| Stale record | No new assessment within configured care interval | `Record may need updating` |

### 10.2 Flag lifecycle

Each flag should have `open`, `acknowledged`, `resolved`, and `dismissed-with-reason` states. Resolution requires a user, timestamp, and note. Dismissal must not delete the underlying observation.

### 10.3 Alert fatigue controls

Group repeated flags from the same evidence window. Show the first trigger, current state, and latest update. Avoid sending a new alert for every unchanged refresh. Provide a review queue that sorts by priority, due date, and patient assignment.

## 11. Search, filtering, sorting, and export

### 11.1 Search

Search should support authorized fields only. For the current de-identified cohort, search may use internal record ID, source row label, baseline categories, and observation metadata. Name, national ID, and contact search should become available only after an approved identity source is linked.

Search input must not be logged in plaintext if it could contain health information. Do not expose search terms in analytics or third-party monitoring.

### 11.2 Filtering and sorting

Provide filters for care team, clinic, wound status, open flags, assessment due state, record completeness, source batch, observation category, and date range. Preserve filter state only in the local session unless the user explicitly saves a view.

### 11.3 Export

Exports must be:

- Role-gated.
- Narrowly scoped to selected records and fields.
- Audited with purpose, actor, timestamp, filters, and destination.
- Generated locally within the approved residency boundary.
- Protected with an expiry or controlled download mechanism.
- Clear about whether values are imported, calculated, estimated, or manually entered.

The default export should exclude photographs and direct identifiers. A separate elevated workflow should be required for media export.

## 12. Accessibility and responsive behavior

The implementation should target WCAG 2.2 AA practices and local accessibility review.[1]

Required behavior:

- Full keyboard access to tabs, filters, tables, drawers, charts, and media controls.
- Visible focus indicators.
- Semantic headings and landmark regions.
- Accessible names for status icons and chart points.
- Text alternatives for every visualization.
- No reliance on color alone.
- Minimum touch targets appropriate for mobile use.
- Respect for reduced-motion preferences.
- Clear focus return when a drawer closes.
- Announcements for loading, save, error, and flag-state changes.
- Error messages associated with the relevant field.

## 13. Privacy, residency, and audit requirements

Local data residency is a release requirement, not an implementation detail.

### 13.1 Data location

Keep the following inside the approved local boundary:

- Primary database.
- File and photograph storage.
- Backups and exports.
- Application logs containing record metadata.
- Audit events.
- Temporary processing files.

Do not transmit patient records, observations, or wound images to external analytics, AI, error-reporting, or image services without documented approval.

### 13.2 Access and masking

Use server-side authorization for every patient and observation procedure. UI hiding is not a security control. Mask direct identifiers by default. Separate the identity-linking service from the de-identified clinical dataset if the hospital later requires both.

### 13.3 Audit trail

Audit events should record:

- Actor and role.
- Patient record and entity type.
- Action: view, create, amend, sign, export, flag, resolve, or access denial.
- Timestamp and timezone.
- Reason where required.
- Before/after values for amendments, with sensitive values protected according to local policy.
- Source device or session metadata only if permitted by policy.

The audit trail should be append-only to application users. Administrative correction requires a separate elevated workflow.

### 13.4 Security controls

Apply secure-session handling, least privilege, input validation, parameterized queries, short-lived media URLs, encrypted transport, encryption at rest where supported, controlled backups, and a documented retention/deletion policy. Use security logging and privacy controls consistent with the application's threat model.[2]

## 14. Empty, loading, error, and data-quality states

| State | Required presentation |
|---|---|
| Loading | Skeleton header and section-level loading states. Do not block the entire page for one slow panel. |
| No patient selected | Explain how to search or select a record. Do not show a fabricated patient. |
| No wound record | `No wound record available` with an authorized action to create one. |
| No observations in range | `No observations recorded in this period` with a clear date-range reset. |
| Missing field | `Not recorded` or `Not provided by source`; never display zero unless zero was recorded. |
| Incomplete assessment | List missing required fields and link to edit if authorized. |
| Duplicate data | Group duplicate candidates, preserve all source records, and require review before merging. |
| Conflicting data | Show values side by side with source, author, and event time. Do not auto-resolve. |
| Import not verified | Mark baseline records as imported and unverified. |
| Permission denied | Explain that the user's role or assignment does not permit access. Do not reveal whether a hidden record exists. |
| Server/database error | Provide a retry action and a support reference ID. Do not expose SQL or sensitive payloads. |
| Offline/poor connection | Show last successfully loaded timestamp and prevent silent edits. Queueing edits requires an explicit local-storage and synchronization design. |

## 15. Data model

The following model separates the imported baseline cohort from future longitudinal wound records while allowing both to appear in one patient view.

### 15.1 Entities and relationships

| Entity | Key fields | Relationships |
|---|---|---|
| `Patient` | `id`, governed identity reference, record state, residency scope, created/updated timestamps | Has many observations, wounds, treatments, media, notes, timeline events, and audit events. |
| `ImportBatch` | `id`, filename, SHA-256, source count, created timestamp | Has many imported patient rows and source observations. |
| `ImportedPatientBaseline` | `id`, `patientId` when identity-linked, `importBatchId`, source row, age, sex, diabetes indicators | Belongs to one import batch; may be linked to one patient only through an approved identity workflow. Current `diabetesPatients` is this entity in the existing implementation. |
| `ClinicalObservation` | `id`, patient, type, value number/text, unit, reference metadata, event time, recorded time, author, source, status | Belongs to one patient; may link to wound, treatment, media, or flag. Current `diabetesPatientObservations` stores imported observations. |
| `Wound` | `id`, patient, location, side, classification system/value, status, created/resolved timestamps | Has many assessments, treatments, media, flags, and timeline events. |
| `WoundAssessment` | `id`, wound, assessment time, author, classification, tissue, drainage, odor, pain, infection indicators, notes, completion state | Has many measurements and media attachments. |
| `WoundMeasurement` | `id`, assessment, length, width, depth, area, volume, unit, method, calculation method, quality state | Belongs to one assessment; used by comparison and trend views. |
| `Treatment` | `id`, patient/wound, plan text or coded treatment, frequency, owner, start/end dates, status, author | May be linked to assessments, notes, and timeline events. |
| `MediaAttachment` | `id`, patient/wound/assessment/observation, local object key, media type, captured time, author/source, consent state, checksum | Belongs to one protected residency-controlled object and one or more clinical entities. |
| `TimelineEvent` | `id`, patient, entity type/id, event type, event time, summary, source | Provides a read model for cross-domain chronology. |
| `ClinicalFlag` | `id`, patient, entity reference, rule key/version, priority, state, evidence references, acknowledged/resolved metadata | Links review prompts to underlying observations or missing-data conditions. |
| `AuditEvent` | `id`, actor, role, patient/entity reference, action, timestamp, reason, metadata | Append-only record of access and changes. |

### 15.2 Existing-to-target mapping

The current imported tables should remain backward-compatible:

- `diabetesImportBatches` maps to `ImportBatch`.
- `diabetesPatients` maps to `ImportedPatientBaseline` until an approved identity-linking workflow creates a unified `Patient` row.
- `diabetesPatientObservations` maps to `ClinicalObservation` for imported source observations.
- `users` remains the authentication and application-user table. It must not be used as the patient table.

The wound entities should be introduced additively. The imported cohort should be linkable to a unified `Patient` only after a local policy defines who may perform identity matching and how that action is audited.

## 16. API and query design

The current application uses tRPC. Procedures should be protected and should enforce scope on the server.

### 16.1 Patient procedures

```text
patient.list({ query, filters, sort, cursor })
patient.getSummary({ patientId })
patient.getAccessContext({ patientId })
patient.updateAssignments({ patientId, assignments })
```

`patient.getSummary` should return the header read model, latest status, open flags, care team, latest wound assessment, and provenance metadata. It should not return all observations in the same response.

### 16.2 Observation procedures

```text
patient.observations.list({ patientId, category, source, status, startAt, endAt, cursor, limit })
patient.observations.get({ patientId, observationId })
patient.observations.history({ patientId, observationId })
patient.observations.createDraft({ patientId, input })
patient.observations.sign({ patientId, observationId, note })
patient.observations.amend({ patientId, observationId, input, reason })
```

### 16.3 Wound procedures

```text
patient.wounds.list({ patientId, status })
patient.wounds.get({ patientId, woundId })
patient.wounds.assessments.list({ patientId, woundId, startAt, endAt })
patient.wounds.assessments.get({ patientId, woundId, assessmentId })
patient.wounds.assessments.createDraft({ patientId, woundId, input })
patient.wounds.assessments.sign({ patientId, woundId, assessmentId, note })
patient.wounds.measurements.compare({ patientId, woundId, assessmentIds })
```

### 16.4 Timeline and flag procedures

```text
timeline.list({ patientId, startAt, endAt, entityTypes, cursor })
flags.list({ patientId, state, priority })
flags.acknowledge({ patientId, flagId, note })
flags.resolve({ patientId, flagId, note })
```

### 16.5 Media and export procedures

```text
media.list({ patientId, entityType, entityId })
media.createUploadIntent({ patientId, entityType, entityId, metadata })
media.completeUpload({ patientId, mediaId, checksum })
export.create({ patientId, filters, fields, format, purpose })
```

All media URLs must be authorized and short-lived. Export procedures must create audit events before generating files.

### 16.6 Query principles

Use pagination for observations, timeline events, and media. Use aggregate queries or precomputed read models for counts and trend summaries. Avoid loading all 4,714 source columns into the browser. Normalize the imported observations server-side and return typed, display-ready records.

## 17. Acceptance criteria

### Patient summary

- The page identifies the record without fabricating a name or identifier.
- Demographics, diabetes indicators, allergies, diagnoses, risk flags, care team, and latest status each show the correct value, missing state, or permission state.
- Imported records visibly retain source batch provenance.
- The current user sees only records allowed by server-side scope checks.

### Observations

- A user can filter by category, source, status, and date range.
- Every observation displays value, unit, event time, recorded time, author/source, notes, and related media state when available.
- Opening an observation reveals its complete history and audit state.
- Missing, conflicting, duplicate, and unverified values are distinguishable from zero or normal values.

### Wounds

- One patient can have multiple wounds.
- Each wound supports multiple assessments and measurements without overwriting history.
- Dimensions, tissue, drainage, odor, pain, infection indicators, treatment plan, notes, photographs, and assessment metadata are all represented.
- The UI never turns a recorded infection indicator into a diagnosis.

### Trends and comparison

- Users can switch among past week, past month, past quarter, full history, and custom date ranges.
- Charts show exact recorded points, units, method, missing gaps, and measurement changes.
- Comparison identifies non-comparable values and does not silently interpolate or infer clinical meaning.

### Alerts and safety

- Flags link to their evidence and rule version.
- Users can acknowledge and resolve flags with an audit note.
- Alerts are worded as review prompts and never as autonomous diagnoses or treatment orders.

### Privacy and operations

- Direct identifiers and media are protected by role and scoped access.
- Exports are audited and generated inside the local residency boundary.
- The application remains usable on small screens and with keyboard navigation.
- Loading, empty, error, missing-data, duplicate-data, conflict, and permission states are implemented.

### Data integrity

- The imported 100-record cohort remains retrievable through the protected API.
- The 42,859 imported observations remain linked to the correct source patient rows.
- Re-running the same import cannot create duplicate batches or observations.

## 18. Prioritized implementation plan

### P0 — Safe record foundation

1. Define the governed `Patient` identity-linking decision and keep de-identified imported records separate until approved.
2. Add role and assignment checks to protected patient procedures.
3. Implement the patient summary read model with provenance, missing states, and latest status.
4. Add an audit event for every patient view and every record mutation.
5. Add the observation list and detail drawer using the existing imported tables.

### P1 — Wound workflow

1. Add `wounds`, `woundAssessments`, and `woundMeasurements` tables.
2. Add the multi-wound selector and assessment detail view.
3. Add local media storage with authorized upload and preview flows.
4. Add treatment and clinician-note entities with draft and sign-off states.

### P1 — Timeline and comparison

1. Build the unified timeline read model.
2. Add common and custom date filters.
3. Add measurement comparison with method and comparability warnings.
4. Add accessible chart and data-table alternatives.

### P2 — Review flags and operational controls

1. Implement configurable review rules with versioned metadata.
2. Add the review queue, acknowledgement, resolution, and escalation workflow.
3. Add duplicate and conflict-review workflows.
4. Add scoped export with audit logging.

### P2 — Production readiness

1. Confirm local residency for database, storage, backups, logs, and exports.
2. Complete local privacy, security, and clinical governance review.
3. Add retention, correction, and deletion procedures.
4. Run accessibility, low-bandwidth, role-permission, and audit-trail tests with village nurses and supervising clinicians.

## 19. Open decisions before production implementation

The following decisions remain intentionally unresolved because they materially affect the data model or safety behavior:

- What approved identity source, if any, will link de-identified workbook rows to real patients?
- Which classification system and wound measurement protocol will the hospital use?
- What fields are mandatory for an assessment in each care setting?
- Which local rules define overdue review, measurement change, and possible infection indicators?
- What retention, correction, export, and deletion periods apply?
- Which local storage and backup infrastructure satisfies residency requirements?
- Which roles may view photographs, identifiers, and exports?
- Which clinical supervisor signs off the decision-support wording and thresholds?

## References

[1]: https://www.w3.org/TR/WCAG22/ "Web Content Accessibility Guidelines (WCAG) 2.2"

[2]: https://owasp.org/www-project-application-security-verification-standard/ "OWASP Application Security Verification Standard"
