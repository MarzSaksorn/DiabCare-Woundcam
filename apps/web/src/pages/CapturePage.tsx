import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { StateChip } from '@/components/StateChip'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'

/**
 * Page 7 — Capture (FR-CAP-1..9). Camera-first viewfinder, fill-frame
 * outline, ghost overlay (adjustable opacity), live per-element warnings
 * (icon + text, never color alone), single green check enables shutter,
 * 10 s force-enable with `unverified` flag (FR-CAP-7).
 *
 * D4 spike (build plan F4) decides the real focus/sticker method — the
 * check pipeline below is the seam: swap `runQualityCheck` for WASM CV
 * or heuristics without touching the UI.
 */
type CheckKey = 'inFrame' | 'focus' | 'ruler' | 'exposure'

const CHECKS: CheckKey[] = ['inFrame', 'focus', 'ruler', 'exposure']

export function CapturePage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { woundId } = useParams<{ woundId: string }>()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [cameraState, setCameraState] = useState<'initializing' | 'live' | 'denied'>('initializing')
  const [failing, setFailing] = useState<Set<CheckKey>>(new Set(CHECKS))
  const [ghostOpacity, setGhostOpacity] = useState(0.3)
  const [forceEnabled, setForceEnabled] = useState(false)

  useEffect(() => {
    let stream: MediaStream | null = null
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        stream = s
        if (videoRef.current) {
          videoRef.current.srcObject = s
          void videoRef.current.play()
        }
        setCameraState('live')
      })
      .catch(() => setCameraState('denied'))
    return () => stream?.getTracks().forEach((track) => track.stop())
  }, [])

  // Quality-check seam: real implementation lands with the D4 spike.
  const runQualityCheck = useCallback(async (): Promise<Set<CheckKey>> => {
    return new Set()
  }, [])

  useEffect(() => {
    if (cameraState !== 'live') return
    const interval = setInterval(() => {
      void runQualityCheck().then((failing) => {
        setFailing(failing)
        if (failing.size === 0) clearInterval(interval)
      })
    }, 500)
    const timeout = setTimeout(() => setForceEnabled(true), 10_000)
    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [cameraState, runQualityCheck])

  const passed = cameraState === 'live' && (failing.size === 0 || forceEnabled)

  const shutter = () => {
    if (!passed) return
    navigate(`/wounds/${woundId ?? 'new'}/review`, {
      state: { unverified: forceEnabled && failing.size > 0 },
    })
  }

  return (
    <Layout title={t('capture.title')}>
      {cameraState === 'denied' ? (
        <p role="alert" className="rounded-card border border-hairline bg-paper p-6 text-center shadow-card">
          {t('capture.cameraDenied')}
        </p>
      ) : (
        <div className="relative overflow-hidden rounded-card border border-hairline bg-primary shadow-card">
          <video ref={videoRef} playsInline muted className="aspect-[3/4] w-full object-cover" />
          {/* Fill-frame dashed outline (FR-CAP-2) + ghost overlay (FR-CAP-3) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-[12%] rounded-card border-2 border-dashed border-white/80"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-canvas"
            style={{ opacity: ghostOpacity * 0.5, mixBlendMode: 'screen' }}
          />
          {/* Live warnings — icon + text on the outline, never color alone (FR-CAP-4) */}
          <ul className="absolute inset-x-4 top-4 flex flex-wrap gap-2">
            {CHECKS.map((key) => (
              <li key={key}>
                <StateChip
                  icon={failing.has(key) ? 'fail' : 'ok'}
                  tone={failing.has(key) ? 'fail' : 'pass'}
                  label={t(`state.${key === 'ruler' ? 'rulerVisible' : key === 'exposure' ? 'exposureOk' : key}`)}
                  className="bg-paper/90"
                />
              </li>
            ))}
          </ul>
          {forceEnabled && failing.size > 0 && (
            <div className="absolute inset-x-4 bottom-28">
              <StateChip icon="unverified" tone="fail" label={t('state.unverified')} className="bg-paper/90" />
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center justify-center gap-6">
        <label className="flex items-center gap-2 text-caption text-mid-gray">
          {/* FR-CAP-8: adjustable ghost opacity (low-vision support) */}
          <input
            type="range"
            min={0}
            max={0.6}
            step={0.1}
            value={ghostOpacity}
            onChange={(e) => setGhostOpacity(Number(e.target.value))}
            aria-label="ghost opacity"
            className="w-28"
          />
        </label>
        <button
          type="button"
          onClick={shutter}
          disabled={!passed}
          aria-label={t('capture.shutter')}
          className={cn(
            'flex h-20 w-20 items-center justify-center rounded-full text-body font-semibold transition-opacity',
            passed ? 'bg-primary text-white' : 'bg-primary/30 text-white',
          )}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
          </svg>
        </button>
      </div>
    </Layout>
  )
}
