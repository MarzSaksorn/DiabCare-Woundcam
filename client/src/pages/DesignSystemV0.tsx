import {
  Activity,
  AlertTriangle,
  Bell,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileImage,
  FileText,
  HeartPulse,
  LayoutDashboard,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import "@/styles/design-system-v0.css";

type SectionId =
  | "overview"
  | "patients"
  | "assessments"
  | "reports"
  | "settings";

type NavItem = {
  id: SectionId;
  label: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "patients", label: "Patients", icon: Users },
  { id: "assessments", label: "Assessments", icon: Camera },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
];

const patients = [
  {
    code: "PT-2841",
    name: "Patient record A",
    location: "North clinic",
    status: "Needs review",
    tone: "warning",
    date: "Today, 08:40",
  },
  {
    code: "PT-2718",
    name: "Patient record B",
    location: "Riverside clinic",
    status: "Stable",
    tone: "stable",
    date: "Yesterday, 16:20",
  },
  {
    code: "PT-2630",
    name: "Patient record C",
    location: "North clinic",
    status: "Critical",
    tone: "critical",
    date: "Yesterday, 11:05",
  },
];

export default function DesignSystemV0() {
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const activeItem =
    navItems.find(item => item.id === activeSection) ?? navItems[0];
  const ActiveIcon = activeItem.icon;

  return (
    <div className="v0-shell">
      <aside className="v0-sidebar" aria-label="Primary navigation">
        <Brand />
        <div className="v0-sidebar-label">Care workspace</div>
        <nav className="v0-nav">
          {navItems.map(item => (
            <NavButton
              key={item.id}
              item={item}
              active={activeSection === item.id}
              onSelect={setActiveSection}
            />
          ))}
        </nav>
        <div className="v0-sidebar-spacer" />
        <div className="v0-side-safety">
          <ShieldCheck aria-hidden="true" />
          <div>
            <strong>Protected workspace</strong>
            <span>
              Patient data stays inside the approved deployment boundary.
            </span>
          </div>
        </div>
        <button
          type="button"
          className="v0-user-card"
          aria-label="Open clinician profile"
        >
          <span className="v0-user-avatar">LC</span>
          <span className="v0-user-copy">
            <strong>Local clinician</strong>
            <small>Care team member</small>
          </span>
          <ChevronRight aria-hidden="true" />
        </button>
      </aside>

      <div className="v0-main">
        <header className="v0-topbar">
          <div className="v0-mobile-brand">
            <Brand compact />
          </div>
          <div className="v0-breadcrumb">
            <ActiveIcon aria-hidden="true" />
            <span>{activeItem.label}</span>
            <span className="v0-breadcrumb-muted">/ v0 prototype</span>
          </div>
          <div className="v0-topbar-actions">
            <span className="v0-sync-status">
              <span className="v0-status-dot stable" /> Connected
            </span>
            <button
              type="button"
              className="v0-icon-button"
              aria-label="Notifications"
            >
              <Bell aria-hidden="true" />
              <span className="v0-notification-dot" />
            </button>
            <button
              type="button"
              className="v0-icon-button v0-top-avatar"
              aria-label="Open clinician profile"
            >
              <UserRound aria-hidden="true" />
            </button>
          </div>
        </header>

        <main className="v0-content">
          {activeSection === "overview" && (
            <OverviewScreen
              onOpenAssessment={() => setActiveSection("assessments")}
            />
          )}
          {activeSection === "patients" && <PatientsScreen />}
          {activeSection === "assessments" && <AssessmentScreen />}
          {activeSection === "reports" && <ReportsScreen />}
          {activeSection === "settings" && <SettingsScreen />}
          <DesignSystemPreview />
        </main>

        <nav className="v0-mobile-nav" aria-label="Mobile primary navigation">
          {navItems.map(item => (
            <NavButton
              key={item.id}
              item={item}
              active={activeSection === item.id}
              onSelect={setActiveSection}
              compact
            />
          ))}
        </nav>
      </div>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`v0-brand ${compact ? "is-compact" : ""}`}>
      <img src="/assets/diabcare-logo.jpg" alt="DiabCare WoundCam" />
      {!compact && (
        <span>
          <strong>DiabCare</strong>
          <small>WoundCam</small>
        </span>
      )}
    </div>
  );
}

function NavButton({
  item,
  active,
  onSelect,
  compact = false,
}: {
  item: NavItem;
  active: boolean;
  onSelect: (id: SectionId) => void;
  compact?: boolean;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      className={`v0-nav-item ${active ? "is-active" : ""} ${compact ? "is-compact" : ""}`}
      onClick={() => onSelect(item.id)}
      aria-current={active ? "page" : undefined}
    >
      <Icon aria-hidden="true" />
      <span>{item.label}</span>
    </button>
  );
}

function PageHeader({
  eyebrow,
  title,
  detail,
  action,
  actionLabel,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <header className="v0-page-header">
      <div>
        <span className="v0-eyebrow">
          <span /> {eyebrow}
        </span>
        <h1>{title}</h1>
        <p>{detail}</p>
      </div>
      {action && actionLabel && (
        <button
          type="button"
          className="v0-button v0-button-primary"
          onClick={action}
        >
          <Camera aria-hidden="true" /> {actionLabel}
        </button>
      )}
    </header>
  );
}

function OverviewScreen({
  onOpenAssessment,
}: {
  onOpenAssessment: () => void;
}) {
  return (
    <>
      <PageHeader
        eyebrow="Clinical command center"
        title="Good morning, care team"
        detail="A focused view of the records, reviews, and wound evidence that need attention today."
        action={onOpenAssessment}
        actionLabel="Capture wound"
      />
      <div className="v0-context-strip">
        <div>
          <span className="v0-strip-icon">
            <ShieldCheck aria-hidden="true" />
          </span>
          <div>
            <strong>Connected clinical data</strong>
            <span>Last synced a few seconds ago · source preserved</span>
          </div>
        </div>
        <span className="v0-chip v0-chip-stable">All systems ready</span>
      </div>
      <section
        className="v0-metric-grid"
        aria-label="Clinical workspace summary"
      >
        <MetricCard
          icon={Users}
          label="Active patients"
          value="124"
          detail="+8 this month"
          tone="blue"
        />
        <MetricCard
          icon={ClipboardList}
          label="Open reviews"
          value="18"
          detail="5 due today"
          tone="warning"
        />
        <MetricCard
          icon={FileImage}
          label="Visible wound photos"
          value="42"
          detail="Across 31 records"
          tone="stable"
        />
        <MetricCard
          icon={HeartPulse}
          label="Care plans current"
          value="96%"
          detail="Based on active records"
          tone="blue"
        />
      </section>
      <div className="v0-content-grid">
        <section
          className="v0-card v0-card-large"
          aria-labelledby="review-queue-title"
        >
          <CardHeading
            eyebrow="Review queue"
            title="Patients needing your attention"
            detail="Prioritized by clinical status and next review date"
            action="View all patients"
          />
          <div className="v0-patient-list">
            {patients.map(patient => (
              <PatientRow key={patient.code} patient={patient} />
            ))}
          </div>
          <div className="v0-inline-note">
            <AlertTriangle aria-hidden="true" />
            <span>
              Urgent alerts stay visible here. Nothing critical is hidden in a
              menu.
            </span>
          </div>
        </section>
        <aside className="v0-card" aria-labelledby="today-title">
          <CardHeading
            eyebrow="Today"
            title="Your worklist"
            detail="A simple plan for the next shift"
          />
          <div className="v0-worklist">
            <WorkItem
              icon={AlertTriangle}
              title="Review 5 priority records"
              detail="Due before 12:00"
              tone="critical"
            />
            <WorkItem
              icon={Camera}
              title="Complete 3 wound captures"
              detail="2 patients already selected"
              tone="blue"
            />
            <WorkItem
              icon={CheckCircle2}
              title="2 care plans on track"
              detail="No action needed"
              tone="stable"
            />
          </div>
          <button
            type="button"
            className="v0-button v0-button-secondary v0-full-button"
          >
            <SlidersHorizontal aria-hidden="true" /> Adjust worklist
          </button>
        </aside>
      </div>
      <section
        className="v0-card v0-evidence-card"
        aria-labelledby="evidence-title"
      >
        <div className="v0-evidence-placeholder">
          <FileImage aria-hidden="true" />
          <span>Clinical image placeholder</span>
          <small>
            Real wound evidence will appear here when a record is selected.
          </small>
        </div>
        <div className="v0-evidence-copy">
          <span className="v0-eyebrow">Selected patient</span>
          <h2 id="evidence-title">Patient record A</h2>
          <p>PT-2841 · North clinic · last reviewed today</p>
          <div className="v0-evidence-metrics">
            <div>
              <span>Wound area</span>
              <strong>2.4 cm²</strong>
            </div>
            <div>
              <span>Next review</span>
              <strong>Today</strong>
            </div>
            <div>
              <span>Evidence status</span>
              <strong className="v0-text-warning">Review needed</strong>
            </div>
          </div>
          <button type="button" className="v0-button v0-button-secondary">
            Open patient record <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </section>
      <SafetyBanner />
    </>
  );
}

function PatientsScreen() {
  return (
    <>
      <PageHeader
        eyebrow="Patient registry"
        title="Patient records"
        detail="Search de-identified clinical records and open the next safe review step."
      />
      <div className="v0-toolbar">
        <label className="v0-search">
          <Search aria-hidden="true" />
          <input
            aria-label="Search patient records"
            placeholder="Search by patient code or name"
          />
        </label>
        <button type="button" className="v0-button v0-button-secondary">
          <SlidersHorizontal aria-hidden="true" /> Filters
        </button>
        <button type="button" className="v0-button v0-button-primary">
          <Plus aria-hidden="true" /> Register patient
        </button>
      </div>
      <section className="v0-card" aria-labelledby="registry-title">
        <CardHeading
          eyebrow="Connected records"
          title="Active patient registry"
          detail="124 records in scope"
        />
        <div className="v0-registry-list">
          {patients.map(patient => (
            <PatientRow key={patient.code} patient={patient} showArrow />
          ))}
        </div>
      </section>
    </>
  );
}

function AssessmentScreen() {
  return (
    <>
      <PageHeader
        eyebrow="Wound assessment"
        title="Capture wound image"
        detail="Select a patient first. Keep the photo, model output, and clinical review in one place."
      />
      <div className="v0-assessment-layout">
        <section
          className="v0-card v0-camera-card"
          aria-labelledby="camera-title"
        >
          <CardHeading
            eyebrow="Step 1"
            title="Capture evidence"
            detail="Use the tablet camera or upload a still image"
            action="Camera ready"
          />
          <div className="v0-camera-frame">
            <div className="v0-frame-corners">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="v0-camera-placeholder">
              <Camera aria-hidden="true" />
              <strong>Ready to capture</strong>
              <span>Position the wound inside the guide.</span>
            </div>
            <span className="v0-camera-status">
              <span className="v0-status-dot stable" /> Camera ready
            </span>
          </div>
          <div className="v0-button-row">
            <button type="button" className="v0-button v0-button-primary">
              <Camera aria-hidden="true" /> Open camera
            </button>
            <button type="button" className="v0-button v0-button-secondary">
              <FileImage aria-hidden="true" /> Upload image
            </button>
          </div>
        </section>
        <section className="v0-card" aria-labelledby="analysis-title">
          <CardHeading
            eyebrow="Step 2"
            title="Review before analysis"
            detail="The clinician stays in control of the decision"
          />
          <div className="v0-review-empty">
            <FileImage aria-hidden="true" />
            <strong>No image yet</strong>
            <span>Capture or upload a wound image to continue.</span>
          </div>
          <div className="v0-safety-mini">
            <ShieldCheck aria-hidden="true" />
            <span>
              Model output is decision support only. A qualified clinician must
              verify it.
            </span>
          </div>
        </section>
      </div>
    </>
  );
}

function ReportsScreen() {
  return (
    <>
      <PageHeader
        eyebrow="Clinical reporting"
        title="Reports"
        detail="A calm summary of activity and evidence coverage for the care team."
      />
      <div className="v0-report-grid">
        <MetricCard
          icon={Activity}
          label="Reviews completed"
          value="86"
          detail="This month"
          tone="stable"
        />
        <MetricCard
          icon={HeartPulse}
          label="Wound area improving"
          value="72%"
          detail="From repeated measurements"
          tone="blue"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Needs follow-up"
          value="9"
          detail="Across 7 records"
          tone="warning"
        />
      </div>
      <section className="v0-card">
        <CardHeading
          eyebrow="Coverage"
          title="Evidence captured over time"
          detail="Prototype chart placeholder for a future governed report"
        />
        <div className="v0-chart-placeholder">
          <div className="v0-chart-bars">
            <span style={{ height: "42%" }} />
            <span style={{ height: "58%" }} />
            <span style={{ height: "51%" }} />
            <span style={{ height: "70%" }} />
            <span style={{ height: "64%" }} />
            <span style={{ height: "82%" }} />
          </div>
          <div className="v0-chart-labels">
            <span>Jan</span>
            <span>Feb</span>
            <span>Mar</span>
            <span>Apr</span>
            <span>May</span>
            <span>Jun</span>
          </div>
        </div>
      </section>
    </>
  );
}

function SettingsScreen() {
  return (
    <>
      <PageHeader
        eyebrow="Workspace settings"
        title="Settings"
        detail="Keep the clinical workspace predictable, private, and easy to operate."
      />
      <section className="v0-card v0-settings-card">
        <SettingRow
          title="Language"
          detail="English · Thai available"
          value="English"
        />
        <SettingRow
          title="Notifications"
          detail="Critical alerts and review reminders"
          value="Enabled"
        />
        <SettingRow
          title="Data boundary"
          detail="Approved local deployment"
          value="Protected"
        />
      </section>
    </>
  );
}

function CardHeading({
  eyebrow,
  title,
  detail,
  action,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  action?: string;
}) {
  return (
    <div className="v0-card-heading">
      <div>
        <span className="v0-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{detail}</p>
      </div>
      {action && (
        <button type="button" className="v0-text-button">
          {action} <ChevronRight aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "warning" | "stable";
}) {
  return (
    <article className={`v0-metric-card tone-${tone}`}>
      <span className="v0-metric-icon">
        <Icon aria-hidden="true" />
      </span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}

function PatientRow({
  patient,
  showArrow = false,
}: {
  patient: (typeof patients)[number];
  showArrow?: boolean;
}) {
  return (
    <button type="button" className="v0-patient-row">
      <span className="v0-patient-avatar">
        <Users aria-hidden="true" />
      </span>
      <span className="v0-patient-copy">
        <strong>{patient.name}</strong>
        <small>
          {patient.code} · {patient.location}
        </small>
      </span>
      <span className={`v0-chip v0-chip-${patient.tone}`}>
        {patient.status}
      </span>
      <span className="v0-patient-date">{patient.date}</span>
      {showArrow && (
        <ChevronRight className="v0-row-arrow" aria-hidden="true" />
      )}
    </button>
  );
}

function WorkItem({
  icon: Icon,
  title,
  detail,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  tone: "critical" | "blue" | "stable";
}) {
  return (
    <div className="v0-work-item">
      <span className={`v0-work-icon ${tone}`}>
        <Icon aria-hidden="true" />
      </span>
      <div>
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
      <ChevronRight aria-hidden="true" />
    </div>
  );
}

function SettingRow({
  title,
  detail,
  value,
}: {
  title: string;
  detail: string;
  value: string;
}) {
  return (
    <div className="v0-setting-row">
      <div>
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
      <button type="button" className="v0-button v0-button-secondary">
        {value}
        <ChevronRight aria-hidden="true" />
      </button>
    </div>
  );
}

function SafetyBanner() {
  return (
    <section className="v0-safety-banner">
      <ShieldCheck aria-hidden="true" />
      <div>
        <strong>Decision support, not diagnosis</strong>
        <p>
          Model output and wound images support clinical review. A qualified
          clinician must verify findings before any care decision.
        </p>
      </div>
    </section>
  );
}

function DesignSystemPreview() {
  return (
    <section className="v0-system-card" aria-labelledby="system-preview-title">
      <div className="v0-system-heading">
        <div>
          <span className="v0-eyebrow">Design system v0</span>
          <h2 id="system-preview-title">Clarity is the visual feature</h2>
          <p>
            Atoms and states shown here are the foundation for the full frontend
            refresh.
          </p>
        </div>
        <span className="v0-version-pill">Review build · 0.1</span>
      </div>
      <div className="v0-system-grid">
        <div>
          <span className="v0-system-label">Status palette</span>
          <div className="v0-swatches">
            <span className="v0-swatch critical">
              <i />
              Critical
            </span>
            <span className="v0-swatch warning">
              <i />
              Warning
            </span>
            <span className="v0-swatch stable">
              <i />
              Stable
            </span>
            <span className="v0-swatch action">
              <i />
              Action
            </span>
          </div>
        </div>
        <div>
          <span className="v0-system-label">Type scale</span>
          <div className="v0-type-samples">
            <strong>32px Headline</strong>
            <span>24px Patient name</span>
            <small>20px Body text</small>
            <b>28px Metric data</b>
          </div>
        </div>
        <div>
          <span className="v0-system-label">Interaction atoms</span>
          <div className="v0-atom-row">
            <button type="button" className="v0-button v0-button-primary">
              Primary action
            </button>
            <button type="button" className="v0-button v0-button-secondary">
              Secondary
            </button>
            <span className="v0-chip v0-chip-warning">Needs review</span>
          </div>
        </div>
      </div>
    </section>
  );
}
