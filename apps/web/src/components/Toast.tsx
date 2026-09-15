import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Toast — save confirmations + reassurance-first errors (FR-PLT-2, tone rule 3).
 * Rendered in an aria-live region so screen readers announce without focus steal.
 */

export interface ToastMessage {
  id: number
  kind: 'success' | 'error'
  text: string
}

interface ToastContextValue {
  showToast: (kind: ToastMessage['kind'], text: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const nextId = useRef(1)

  const showToast = useCallback((kind: ToastMessage['kind'], text: string) => {
    const id = nextId.current++
    setToasts((prev) => [...prev, { id, kind, text }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-center gap-2 rounded-pill px-4 py-2 text-body shadow-card',
              toast.kind === 'success' ? 'bg-ink-soft text-[#fafafa]' : 'bg-paper text-ember ring-1 ring-ember/40',
            )}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="h-4 w-4 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              {toast.kind === 'success' ? (
                <path d="M3 8.5l3 3 7-7.5" />
              ) : (
                <>
                  <path d="M8 3.5v5.5" />
                  <path d="M8 12.4v.2" />
                </>
              )}
            </svg>
            <span>{toast.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
