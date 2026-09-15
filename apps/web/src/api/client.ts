import type {
  AuthSession,
  ConsentRecord,
  LiveOverviewStats,
  Patient,
  PatientOverviewStats,
  Photo,
  UploadTicket,
  Wound,
} from './types'
import { mock } from './mock'

/**
 * API client stub. Talks to mocks now; the frozen contract (build plan CP1)
 * swaps `USE_MOCKS` to false and fills the real fetch paths without touching
 * call sites. Endpoints follow PRD FR-UPL/FR-PAT/FR-WND.
 */
const USE_MOCKS = true

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/v1'
const STATS_BASE_URL = import.meta.env.VITE_STATS_BASE_URL ?? 'http://localhost:3001'

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/**
 * Full-shape guard for the live overview: every field the dashboard renders
 * must be present and correctly typed, hba1c.trend included — a malformed
 * response must fall back to mock, never crash a render (audit round 2).
 */
function isValidLiveOverview(json: unknown): json is LiveOverviewStats {
  const o = json as LiveOverviewStats | null
  if (!o || typeof o !== 'object') return false
  const p = o.patients
  const h = o.hba1c
  return (
    !!p &&
    !!h &&
    isNum(p.total) &&
    isNum(p.type1) &&
    isNum(p.type2) &&
    isNum(p.gdm) &&
    isNum(p.female) &&
    isNum(p.male) &&
    isNum(p.avgAge) &&
    isNum(p.insulinUsers) &&
    isNum(p.ckd) &&
    isNum(h.avgOverall) &&
    Array.isArray(h.trend) &&
    h.trend.every(
      (t) => !!t && isNum(t.avg) && (typeof t.period === 'string' || isNum(t.period)),
    )
  )
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${path}`)
  }
  return (await res.json()) as T
}

export const api = {
  login: (identifier: string, password: string): Promise<AuthSession> =>
    USE_MOCKS
      ? mock.login(identifier, password)
      : request('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ identifier, password }),
        }),

  logout: (): Promise<void> =>
    USE_MOCKS ? mock.logout() : request('/auth/logout', { method: 'POST' }),

  getSession: (): Promise<AuthSession | null> =>
    USE_MOCKS ? mock.getSession() : Promise.resolve(null),

  listPatients: (search?: string): Promise<Patient[]> =>
    USE_MOCKS
      ? mock.listPatients(search)
      : request(`/patients${search ? `?search=${encodeURIComponent(search)}` : ''}`),

  createPatient: (input: Partial<Patient>): Promise<Patient> =>
    USE_MOCKS
      ? mock.createPatient(input)
      : request('/patients', { method: 'POST', body: JSON.stringify(input) }),

  getPatient: (patientId: string): Promise<Patient> =>
    USE_MOCKS
      ? mock.getPatient(patientId)
      : request(`/patients/${patientId}`),

  listWounds: (patientId: string): Promise<Wound[]> =>
    USE_MOCKS
      ? mock.listWounds(patientId)
      : request(`/patients/${patientId}/wounds`),

  createWound: (input: Partial<Wound>): Promise<Wound> =>
    USE_MOCKS
      ? mock.createWound(input)
      : request('/wounds', { method: 'POST', body: JSON.stringify(input) }),

  listPhotos: (woundId: string): Promise<Photo[]> =>
    USE_MOCKS
      ? mock.listPhotos(woundId)
      : request(`/wounds/${woundId}/photos`),

  createUploadTicket: (woundId: string): Promise<UploadTicket> =>
    USE_MOCKS
      ? mock.createUploadTicket(woundId)
      : request(`/wounds/${woundId}/photos/upload-ticket`, { method: 'POST' }),

  completeUpload: (photoId: string): Promise<Photo> =>
    USE_MOCKS
      ? mock.completeUpload(photoId)
      : request(`/photos/${photoId}/complete`, { method: 'POST' }),

  acceptConsent: (version: string): Promise<ConsentRecord> =>
    USE_MOCKS
      ? mock.acceptConsent(version)
      : request('/consent', { method: 'POST', body: JSON.stringify({ version }) }),

  getPatientOverviewStats: (): Promise<PatientOverviewStats> =>
    USE_MOCKS
      ? mock.getPatientOverviewStats()
      : request('/patients/overview-stats'),
}

/**
 * Live Srinakarin diabetes EMR aggregates (Forge, GET /v1/stats/overview).
 * Independent of USE_MOCKS — it is a separate data source, not the v1 API.
 * Resolves null on any failure (offline, CORS, timeout, bad shape) so the
 * caller falls back to the sample dataset without an error surface.
 */
export async function fetchLiveOverview(): Promise<LiveOverviewStats | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 4000)
  try {
    const res = await fetch(`${STATS_BASE_URL}/v1/stats/overview`, {
      signal: controller.signal,
    })
    if (!res.ok) return null
    const json: unknown = await res.json()
    if (!isValidLiveOverview(json)) return null
    return json
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}
