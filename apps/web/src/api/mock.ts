import type {
  AuthSession,
  ConsentRecord,
  Patient,
  PatientOverviewStats,
  Photo,
  UploadTicket,
  Wound,
} from './types'

/**
 * In-memory fixtures until the frozen API contract lands (build plan CP1).
 * Shapes mirror src/api/types.ts; latency simulated for loading/error states.
 */

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
  }
}

const patients: Patient[] = [
  {
    id: '01J8ZK3M9P2Q4R5S6T7U8V9W0X',
    mrn: 'HN-0014237',
    fullName: 'สมศรี ใจดี',
    ageYears: 68,
    sex: 'female',
    dmType: 'type2',
    dmOnset: '2015-03-01',
    identifyBy: 'medication',
    hba1c: 7.8,
    consent: true,
    consentVersion: '1.0',
    consentAt: '2026-09-10T09:30:00Z',
    createdAt: '2026-09-10T09:00:00Z',
  },
  {
    id: '01J8ZK5N7P8Q9R0S1T2U3V4W5X',
    mrn: 'HN-0014244',
    fullName: 'ประชา มั่นคง',
    dob: '1959-11-20',
    sex: 'male',
    dmType: 'type2',
    dmOnset: '2012-07-15',
    identifyBy: 'icd10',
    consent: false,
    createdAt: '2026-09-12T14:00:00Z',
  },
]

const wounds: Wound[] = [
  {
    id: '01J8ZM1A2B3C4D5E6F7G8H9J0K',
    patientId: patients[0].id,
    location: 'foot_plantar',
    laterality: 'left',
    status: 'open',
    pendingConfirmation: false,
    firstPhotoAt: '2026-09-11T02:15:00Z',
    createdAt: '2026-09-10T10:00:00Z',
  },
  {
    id: '01J8ZM2C3D4E5F6G7H8J9K0L1M',
    patientId: patients[0].id,
    location: 'toe',
    laterality: 'right',
    status: 'healing',
    pendingConfirmation: true,
    createdAt: '2026-09-13T08:00:00Z',
  },
]

const photos: Photo[] = [
  {
    id: '01J8ZN4E5F6G7H8J9K0L1M2N3O',
    woundId: wounds[0].id,
    r2Key: 'patients/01J8ZK3M9P2Q4R5S6T7U8V9W0X/wounds/01J8ZM1A2B3C4D5E6F7G8H9J0K/2026-09/01J8ZN4E5F6G7H8J9K0L1M2N3O.jpg',
    capturedAt: '2026-09-11T02:15:00Z',
    receivedAt: '2026-09-11T02:15:22Z',
    unverified: false,
  },
  {
    id: '01J8ZN5F6G7H8J9K0L1M2N3O4P',
    woundId: wounds[0].id,
    r2Key: 'patients/01J8ZK3M9P2Q4R5S6T7U8V9W0X/wounds/01J8ZM1A2B3C4D5E6F7G8H9J0K/2026-09/01J8ZN5F6G7H8J9K0L1M2N3O4P.jpg',
    capturedAt: '2026-09-13T23:40:00Z',
    receivedAt: '2026-09-13T23:40:19Z',
    unverified: true,
  },
]

let session: AuthSession | null = null

export const mock = {
  async login(_identifier: string, _password: string): Promise<AuthSession> {
    await wait(400)
    session = {
      accessToken: 'mock.jwt.patient',
      role: 'patient',
      displayName: 'สมศรี ใจดี',
      patientId: patients[0].id,
    }
    return session
  },

  async logout(): Promise<void> {
    await wait(150)
    session = null
  },

  async getSession(): Promise<AuthSession | null> {
    return session
  },

  async listPatients(search?: string): Promise<Patient[]> {
    await wait(250)
    const q = search?.trim().toLowerCase()
    if (!q) return patients
    return patients.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.mrn.toLowerCase().includes(q),
    )
  },

  async createPatient(_input: Partial<Patient>): Promise<Patient> {
    await wait(400)
    throw new ApiError(501, 'not_implemented', 'Mock: awaiting frozen contract')
  },

  async getPatient(patientId: string): Promise<Patient> {
    await wait(200)
    const p = patients.find((x) => x.id === patientId)
    if (!p) throw new ApiError(404, 'not_found', 'Patient not found')
    return p
  },

  async listWounds(patientId: string): Promise<Wound[]> {
    await wait(250)
    return wounds.filter((w) => w.patientId === patientId)
  },

  async createWound(_input: Partial<Wound>): Promise<Wound> {
    await wait(400)
    throw new ApiError(501, 'not_implemented', 'Mock: awaiting frozen contract')
  },

  async listPhotos(woundId: string): Promise<Photo[]> {
    await wait(250)
    return photos
      .filter((p) => p.woundId === woundId)
      .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))
  },

  async createUploadTicket(_woundId: string): Promise<UploadTicket> {
    await wait(200)
    throw new ApiError(501, 'not_implemented', 'Mock: awaiting frozen contract')
  },

  async completeUpload(_photoId: string): Promise<Photo> {
    await wait(300)
    throw new ApiError(501, 'not_implemented', 'Mock: awaiting frozen contract')
  },

  async acceptConsent(version: string): Promise<ConsentRecord> {
    await wait(300)
    return {
      consentAt: new Date().toISOString(),
      documentVersion: version,
      method: 'in_app',
    }
  },

  /**
   * Sample aggregates shaped after the Srinakarin hospital diabetes dataset
   * description (~70k patients; ~2k type1, ~50k type2, ~18k gdm/unknown).
   * Severity split is coherent with 18.4k wound records. No real PHI —
   * representative numbers only.
   */
  async getPatientOverviewStats(): Promise<PatientOverviewStats> {
    await wait(200)
    return {
      totalPatients: 70_000,
      totalWounds: 18_400,
      redAlerts: 124,
      activeReports: 312,
      severityBreakdown: { critical: 890, high: 4_120, normal: 13_390 },
      dmBreakdown: { type1: 2_000, type2: 50_000, gdmUnknown: 18_000 },
      avgHba1c: 8.2,
      // Six 60-day periods, sums to 18,400 — adoption curve growing then flattening
      // (P6 is the current partial period).
      captureTrend: [
        { label: 'P1', count: 1_250 },
        { label: 'P2', count: 2_400 },
        { label: 'P3', count: 3_600 },
        { label: 'P4', count: 4_450 },
        { label: 'P5', count: 4_300 },
        { label: 'P6', count: 2_400 },
      ],
      source: 'sample-dataset',
    }
  },
}
