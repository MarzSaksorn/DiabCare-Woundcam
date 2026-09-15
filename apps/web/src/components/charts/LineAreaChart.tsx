/**
 * Hand-rolled SVG line/area chart — no chart library. Catmull-Rom-smoothed
 * curve, soft dashed grid, palette colors, x tick labels, aria-labelled.
 */

export interface TrendPoint {
  label: string
  count: number
}

export function LineAreaChart({
  points,
  ariaLabel,
  gradientId,
  colorVar = '--color-primary',
}: {
  points: TrendPoint[]
  ariaLabel: string
  /** Unique per page — SVG gradient ids are document-global. */
  gradientId: string
  /** CSS var driving line/dots/gradient — e.g. '--color-primary-deep'. */
  colorVar?: string
}) {
  const W = 320
  const H = 150
  const padL = 10
  const padR = 10
  const padT = 12
  const padB = 26

  const max = Math.max(...points.map((p) => p.count)) * 1.1
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const xs = points.map((_, i) => padL + (i * innerW) / (points.length - 1))
  const ys = points.map((p) => padT + innerH - (p.count / max) * innerH)

  // Catmull-Rom → cubic Bézier for a smooth curve through every point
  let line = `M ${xs[0]} ${ys[0]}`
  for (let i = 0; i < points.length - 1; i++) {
    const x0 = i > 0 ? xs[i - 1] : xs[i]
    const y0 = i > 0 ? ys[i - 1] : ys[i]
    const x1 = xs[i]
    const y1 = ys[i]
    const x2 = xs[i + 1]
    const y2 = ys[i + 1]
    const x3 = i + 2 < points.length ? xs[i + 2] : x2
    const y3 = i + 2 < points.length ? ys[i + 2] : y2
    const c1x = x1 + (x2 - x0) / 6
    const c1y = y1 + (y2 - y0) / 6
    const c2x = x2 - (x3 - x1) / 6
    const c2y = y2 - (y3 - y1) / 6
    line += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${x2.toFixed(2)} ${y2.toFixed(2)}`
  }
  const area = `${line} L ${xs[xs.length - 1]} ${padT + innerH} L ${xs[0]} ${padT + innerH} Z`
  const baseline = padT + innerH

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`var(${colorVar})`} stopOpacity="0.25" />
          <stop offset="100%" stopColor={`var(${colorVar})`} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Soft grid — 3 dashed lines above the baseline */}
      {[1, 2, 3].map((k) => {
        const y = padT + (innerH * k) / 4
        return (
          <line
            key={k}
            x1={padL}
            y1={y}
            x2={W - padR}
            y2={y}
            stroke="var(--color-hairline)"
            strokeWidth="1"
            strokeDasharray="3 4"
          />
        )
      })}
      <line x1={padL} y1={baseline} x2={W - padR} y2={baseline} stroke="var(--color-hairline)" strokeWidth="1" />

      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={`var(${colorVar})`} strokeWidth="2.5" strokeLinecap="round" />

      {points.map((p, i) => {
        const last = i === points.length - 1
        return (
          <g key={p.label}>
            <circle
              cx={xs[i]}
              cy={ys[i]}
              r={last ? 4 : 3}
              fill={last ? `var(${colorVar})` : 'var(--color-paper)'}
              stroke={`var(${colorVar})`}
              strokeWidth="2"
            />
            <text
              x={xs[i]}
              y={H - 8}
              textAnchor="middle"
              fontSize="9.5"
              fill="var(--color-mid-gray)"
            >
              {p.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
