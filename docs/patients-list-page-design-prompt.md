# Prompt-Engineered Design Brief: DiabCare Patients List Page

**Prompt version:** 1.0  
**Target:** UI/UX design or implementation model  
**Product:** DiabCare Woundcam  
**Platform:** Responsive web application using React, TypeScript, TailwindCSS, tRPC, Drizzle, and Supabase PostgreSQL
**Primary users:** Local village nurses and supervising clinicians  
**Clinical safety posture:** Decision support and record review only; never diagnose or prescribe

## Final prompt

```text
You are a senior clinical-product designer and frontend engineer designing the Patients workspace for DiabCare Woundcam, a privacy-sensitive clinical companion application used mostly by local village nurses and supervising clinicians.

Your task is to design and implement a polished, responsive Patients list page that helps a nurse find the right patient or de-identified clinical record quickly, understand which records need review, and open a safe patient-record detail view without fabricating identity or clinical meaning.

PRODUCT CONTEXT
- DiabCare Woundcam monitors diabetes-related clinical observations and wound-healing progress.
- The current application is React + TypeScript + TailwindCSS + tRPC + Drizzle + Supabase PostgreSQL.
- Authentication already exists. Patient data must be protected by server-side role and assignment checks.
- The imported workbook contains 100 de-identified diabetes records and periodized observations. It does not contain patient names, contact details, national IDs, wound records, photographs, or clinician-authored notes.
- The current database separates authentication users from clinical records. Do not use the users table as a patient table.
- Local data residency is required. Do not send patient data, search terms, clinical observations, or wound images to third-party analytics, AI, image-processing, or remote storage services.

DESIGN DIRECTION
Create a calm, dense-but-readable clinical operations interface. Preserve the existing DiabCare visual language:
- Soft bone canvas: #F6F7F4
- Deep ink primary: #132238
- Muted sage for improving or complete states: #6D9681
- Terracotta for urgent review prompts: #C86B52
- Amber for due or incomplete states: #D9A441
- IBM Plex Sans Thai for headings, controls, tables, metadata, and body text in both English and Thai
- 8px spacing rhythm
- 14–16px panel radii
- Soft shadows instead of heavy borders
- Restrained 160–220ms transitions with reduced-motion support

Do not make the page look like a generic CRM, consumer health app, or marketing site. The visual priority is safe record retrieval and operational clarity.

PAGE STRUCTURE
1. Persistent DiabCare sidebar
   - Overview
   - Patients, active
   - Assessments
   - Reports
   - Settings
   - Current user and role in the footer
   - On mobile, collapse to a menu trigger

2. Page header
   - Eyebrow: “CARE WORKSPACE / PATIENTS”
   - Heading: “Patients”
   - Supporting text: “Find a record, review open care work, and continue the patient's timeline.”
   - Primary action: “New patient record” only if the current role is allowed to create one
   - Secondary action: “Export” only if the current role is allowed; explain that exports are audited
   - Show a compact data-scope label such as “Assigned cohort” or “All permitted records”
   - Show last refresh time and a manual refresh control

3. Review summary strip
   Show four or five actionable metrics, not vanity metrics:
   - Records in current scope
   - Open review flags
   - Assessments due this week
   - Records with incomplete data
   - Unverified imported records
   Each metric must include its time scope, comparison or target where valid, and a drill-down action. Do not imply a metric is real-time unless the data source supports it.

4. Search and filter toolbar
   Search only authorized fields. For the current de-identified cohort, support:
   - Internal patient-record ID
   - Imported record label or source row
   - Source batch
   - Baseline categories such as sex or diabetes-type indicators
   - Observation metadata
   Do not invent name or national-ID search fields when those values are absent.

   Include:
   - Search input with clear button
   - Status filter: active, needs review, incomplete, archived, imported/unverified
   - Open-flag priority filter: P1, P2, P3
   - Care-team or clinic filter when configured
   - Assessment due filter: overdue, due soon, scheduled, none
   - Data-source filter: manual, imported workbook, device, document
   - Date-range filter with past week, past month, past quarter, full history, and custom range
   - Reset filters action
   - Saved-view control only if saved views are explicitly supported

   Make the active filter count visible. Keep filter state local to the session unless the user deliberately saves it.

5. Patients result list
   Use a table on desktop and stacked cards on mobile. Keep the first column sticky only when it improves scanning and does not reduce accessibility.

   Required columns or card fields:
   - Record identity state: approved display name when available, otherwise “Imported cohort record #N”
   - Internal record ID or safe label
   - Demographic summary allowed by policy, such as age or age band and sex
   - Diabetes context: recorded type indicators and identification method
   - Latest clinical status, explicitly labeled as recorded or derived from configured rules
   - Open flag count and highest priority
   - Next assessment due or “No due date recorded”
   - Latest wound status only if a wound record exists
   - Data completeness state
   - Last updated timestamp with timezone
   - Row action: “Open record”

   Use status text plus icons and color. Never use color alone. Do not display fabricated patient names, diagnoses, allergies, wounds, photographs, or clinician notes.

6. Row behavior
   - Clicking a row or “Open record” opens the patient-record view.
   - Preserve search, sort, filter, and scroll position when the user returns.
   - Keyboard users must be able to reach every row and action.
   - Do not use nested links or ambiguous click targets.
   - Show a focused hover/focus state, not a decorative animation.

7. Bulk actions
   Add bulk actions only when they are authorized and clinically meaningful:
   - Assign to care team
   - Mark records for review
   - Export selected metadata
   - Archive or restore, if the role and retention policy allow it
   Require a confirmation step for bulk changes and show the exact count and scope. Every bulk action must create an audit event.

8. Detail preview or quick-view drawer
   If a quick view is included, show only a compact summary:
   - Safe identity label
   - Baseline context
   - Open review flags
   - Latest observation timestamp
   - Latest wound status if present
   - “Open full record” action
   Do not load all observations or media into the list view.

DATA AND SAFETY RULES
- Treat “No allergy record available” differently from “No known allergies.”
- Treat missing as missing; never render missing numeric fields as zero.
- Show imported records as “Imported / not clinically verified” until a clinician confirms them.
- Do not infer a diagnosis from a medication indicator, lab value, age, sex, or diabetes-type flag.
- Do not label a record “infected,” “healing,” or “worsening” unless that exact status is recorded or produced by a documented, versioned hospital rule.
- Every review flag must link to its evidence and show whether it was generated by a configurable rule or manually entered.
- Do not expose raw source values beyond the current user's authorization.
- Do not include direct identifiers in telemetry, URLs, screenshots, or error messages.

STATES TO DESIGN
Create explicit designs for all of these states:
1. Loading: skeleton metrics, toolbar, and rows without blocking unrelated UI.
2. Populated: realistic structure using clearly synthetic placeholders, not real patient values.
3. Empty scope: no permitted records, with a clear explanation and access-related next step.
4. No search results: show the active query and a reset action.
5. No active filters: full permitted cohort.
6. Filtered results: visible active-filter summary.
7. Incomplete data: badge plus link to missing fields.
8. Imported and unverified: provenance badge and safe explanation.
9. Open review flags: visible count, priority, and evidence link.
10. Duplicate candidates: grouped review state; do not auto-merge.
11. Conflicting observations: visible warning and link to compare sources.
12. Permission denied: do not reveal whether an inaccessible record exists.
13. Database or network error: retry action and non-sensitive support reference ID.
14. Offline or stale data: show last successful refresh and prevent silent edits.
15. Export in progress, success, failure, and expired-download states.

RESPONSIVE REQUIREMENTS
- Desktop: persistent sidebar, metric strip, full table, optional detail rail.
- Tablet: collapsible sidebar, table with reduced columns, filters in a drawer.
- Mobile: one-column layout, stacked patient cards, filter drawer, sticky search, and large touch targets.
- Preserve the primary action and the current data scope at every breakpoint.
- Do not hide important alert text only in tooltips.

ACCESSIBILITY REQUIREMENTS
- Use semantic headings, landmarks, table semantics, and accessible labels.
- Provide keyboard navigation for search, filters, rows, menus, drawers, and pagination.
- Keep visible focus indicators.
- Provide text alternatives for metric and status visuals.
- Support reduced motion.
- Announce loading, filtering, result-count changes, errors, and successful actions to assistive technology.
- Do not rely on hover-only explanations.

IMPLEMENTATION REQUIREMENTS
- Use the existing DashboardLayout and design tokens rather than creating a parallel navigation system.
- Use typed tRPC queries and mutations; do not introduce an ad hoc fetch client.
- Use server-side pagination and filtering. Do not load the full observation corpus into the browser.
- Return a typed list read model that includes only fields required by the list.
- Keep patient identifiers and search inputs out of analytics.
- Add tests for filter mapping, permission behavior, empty states, duplicate/conflict rendering, and pagination boundaries.
- Preserve existing route contracts and authentication behavior.
- Add loading, error, empty, and permission states before adding visual polish.

RECOMMENDED LIST READ MODEL
```ts
type PatientListRow = {
  patientId: number;
  identityLabel: string;
  identityState: "approved" | "deidentified" | "needs_identity_link";
  age: string | null;
  sex: "FEMALE" | "MALE" | null;
  diabetesContext: {
    type1: 0 | 1 | null;
    type2: 0 | 1 | null;
    gdm: 0 | 1 | null;
    identifyBy: string | null;
  };
  latestClinicalStatus: {
    label: string;
    state: "recorded" | "derived" | "unknown";
    occurredAt: string | null;
  };
  flags: Array<{
    priority: "P1" | "P2" | "P3";
    label: string;
    state: "open" | "acknowledged" | "resolved";
  }>;
  nextAssessmentAt: string | null;
  woundSummary: {
    count: number;
    latestStatus: string | null;
    latestAssessmentAt: string | null;
  };
  completeness: "complete" | "incomplete" | "unknown";
  lastUpdatedAt: string | null;
  source: "imported" | "manual" | "mixed";
};
```

RECOMMENDED API CONTRACT
```text
patient.list({
  query?: string,
  status?: string[],
  priorities?: ("P1" | "P2" | "P3")[],
  source?: string[],
  dueState?: string[],
  completeness?: string[],
  startAt?: string,
  endAt?: string,
  sort?: "lastUpdated" | "priority" | "dueDate" | "identity",
  direction?: "asc" | "desc",
  cursor?: string,
  limit?: number
}) -> {
  items: PatientListRow[],
  nextCursor: string | null,
  totalInScope?: number,
  appliedFilterCount: number,
  refreshedAt: string
}

patient.summaryMetrics({ filters }) -> {
  recordsInScope: number,
  openReviewFlags: number,
  assessmentsDue: number,
  incompleteRecords: number,
  unverifiedImports: number,
  refreshedAt: string
}
```

OUTPUT FORMAT
Return:
1. A concise design rationale.
2. A complete page layout description.
3. Component hierarchy from atoms to organisms.
4. Exact UI copy for headings, labels, empty states, and safety messages.
5. Responsive behavior by breakpoint.
6. Interaction and state specifications.
7. The typed data contract and API assumptions above, adjusted only when necessary.
8. Accessibility and privacy checklist.
9. Implementation notes for the current React/tRPC/Drizzle stack.
10. Acceptance criteria.

Do not fabricate clinical records. Use synthetic placeholders only for visual composition and label them as synthetic.
```

## Component hierarchy

The generated implementation should decompose into the following reusable units:

- **Atoms:** status dot, priority badge, scope badge, timestamp, filter chip, count label, refresh button, empty-state icon.
- **Molecules:** metric card, patient identity cell, flag summary, completeness indicator, due-date cell, search field, filter trigger, pagination control.
- **Organisms:** review summary strip, patient filter toolbar, patient table, patient mobile card list, quick-view drawer, bulk-action bar, export status panel.
- **Template:** `PatientsPage` inside the existing `DashboardLayout`.

## Evaluation rubric

Score the generated design from 0 to 2 for each criterion, for a maximum of 20 points:

| Criterion | 0 | 1 | 2 |
|---|---|---|---|
| Clinical safety | Makes diagnostic claims or fabricates data | Avoids some unsafe wording but leaves ambiguity | Clearly presents observations and review prompts only |
| Identity privacy | Shows invented names or identifiers | Partially masks records | Uses approved identity state and safe labels |
| Retrieval efficiency | Dense but hard to scan | Usable with minor friction | Clear search, scope, priority, and drill-down flow |
| Data-state coverage | Omits major states | Covers common states | Covers loading, empty, error, conflict, duplicate, and permission states |
| Role awareness | UI-only hiding | Some role hints | Server-enforced permissions reflected in UI copy and actions |
| Imported-data fidelity | Invents missing fields | Uses vague placeholders | Preserves imported versus missing versus derived states |
| Responsive behavior | Desktop-only | Basic mobile collapse | Thoughtful desktop, tablet, and mobile patterns |
| Accessibility | Relies on color/hover | Basic labels | Keyboard, semantics, announcements, focus, and reduced motion |
| Technical fit | Introduces unrelated stack | Requires moderate adaptation | Fits existing React/tRPC/Drizzle contracts |
| Operational usefulness | Shows vanity metrics | Shows useful list fields | Prioritizes due work, flags, completeness, and next action |

A design should score at least **17/20** before implementation. Any score of 0 in clinical safety, identity privacy, or technical fit is a blocking failure.

## Known limitations

- The current imported dataset has no approved human-readable identity.
- The existing database does not yet contain the full wound, treatment, media, audit, or clinical-flag entity model described in the patient-record specification.
- Clinical thresholds, wound classification systems, required assessment fields, and alert escalation rules require local clinical governance.
- Local data residency requires deployment and infrastructure verification beyond frontend code.
