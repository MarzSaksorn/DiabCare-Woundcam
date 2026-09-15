import { Navigate, Route, Routes } from 'react-router-dom'
import { I18nProvider } from '@/i18n'
import { ToastProvider } from '@/components/Toast'
import { AddPatientPage } from '@/pages/AddPatientPage'
import { CapturePage } from '@/pages/CapturePage'
import { ClinicianDashboardPage } from '@/pages/ClinicianDashboardPage'
import { ConsentGatePage } from '@/pages/ConsentGatePage'
import { LoginPage } from '@/pages/LoginPage'
import { PatientProfilePage } from '@/pages/PatientProfilePage'
import { ReviewPage } from '@/pages/ReviewPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { WoundDetailPage } from '@/pages/WoundDetailPage'
import { WoundListPage } from '@/pages/WoundListPage'
import { WoundSelectPage } from '@/pages/WoundSelectPage'
import { PatientsPage } from '@/pages/PatientsPage'
import { ReportsPage } from '@/pages/ReportsPage'

/**
 * Route table per docs/pages-draft.md navigation map (11 pages).
 * Guards are structural stubs for D2: real scope checks verify the JWT
 * server-side (FR-LST-3); the client guard only routes, never authorizes.
 */
export function App() {
  return (
    <I18nProvider>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/consent" element={<ConsentGatePage />} />

          {/* Clinician */}
          <Route path="/clinician" element={<ClinicianDashboardPage />} />
          <Route path="/clinician/patients/new" element={<AddPatientPage />} />
          <Route path="/clinician/patients/:patientId" element={<PatientProfilePage />} />

          {/* Patient */}
          <Route path="/" element={<Navigate to="/wounds" replace />} />
          <Route path="/wounds" element={<WoundListPage />} />
          <Route path="/wounds/select" element={<WoundSelectPage />} />
          <Route path="/wounds/:woundId/capture" element={<CapturePage />} />
          <Route path="/wounds/:woundId/review" element={<ReviewPage />} />
          <Route path="/wounds/:woundId" element={<WoundDetailPage />} />

          {/* Bottom-nav destinations */}
          <Route path="/patients" element={<PatientsPage />} />
          <Route path="/reports" element={<ReportsPage />} />

          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/wounds" replace />} />
        </Routes>
      </ToastProvider>
    </I18nProvider>
  )
}
