/**
 * Domain types mocked to the PRD's data shapes (PRD §5/§8).
 * docs/api-contract.md doesn't exist yet (Forge lands it on D2, frozen EOD D2);
 * when it does, reconcile here — response envelope types are the seam.
 */

export type Role = 'patient' | 'clinician'

export interface AuthSession {
  accessToken: string
  role: Role
  /** Patient-facing display name; capturedBy source (FR-CAP-5). */
  displayName: string
  /** For patient scope: the patient record this device is bound to (FR-AUTH-2). */
  patientId?: string
}

export interface Patient {
  id: string
  mrn: string
  fullName: string
  dob?: string
  ageYears?: number
  sex: 'male' | 'female' | 'other'
  dmType: 'type1' | 'type2' | 'gdm'
  dmOnset?: string
  identifyBy: 'medication' | 'icd10' | 'lab'
  hba1c?: number
  consent: boolean
  consentVersion?: string
  consentAt?: string
  createdAt: string
}

export type WoundLocation =
  | 'foot_plantar'
  | 'foot_dorsal'
  | 'heel'
  | 'toe'
  | 'lower_leg'
  | 'other'

export type WoundStatus = 'open' | 'healing' | 'closed' | 'amputated'

export interface Wound {
  id: string
  patientId: string
  location: WoundLocation
  laterality: 'left' | 'right' | 'na'
  status: WoundStatus
  notes?: string
  /** Patient-created records await clinician confirmation (FR-WND-4). */
  pendingConfirmation: boolean
  firstPhotoAt?: string
  createdAt: string
}

export interface Photo {
  id: string
  woundId: string
  r2Key: string
  capturedAt: string
  receivedAt: string
  /** FR-CAP-7: force-enabled captures bypassing the quality check. */
  unverified: boolean
  thumbnailUrl?: string
}

export interface WoundTypeChip {
  id: string
  tissue: string
}

export interface UploadTicket {
  photoId: string
  uploadUrl: string
  /** HMAC-signed, single-use, 5-minute expiry (FR-UPL-1). */
  expiresAt: string
}

export interface ConsentRecord {
  consentAt: string
  documentVersion: string
  method: 'in_app' | 'assisted'
}

/**
 * Aggregates for the clinician overview panel. Shape mirrors FR-PAT-1
 * fields bucketed for display (dm_type, hba1c) — Srinakarin-style schema.
 */
export interface PatientOverviewStats {
  totalPatients: number
  totalWounds: number
  redAlerts: number
  activeReports: number
  severityBreakdown: {
    critical: number
    high: number
    normal: number
  }
  dmBreakdown: {
    type1: number
    type2: number
    gdmUnknown: number
  }
  avgHba1c: number
  /** Marks demo data so the UI can label it honestly. */
  source: 'sample-dataset'
}
