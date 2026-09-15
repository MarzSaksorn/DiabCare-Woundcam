/**
 * Hand-rolled SVG donut — no chart library, ~1 KB. Palette-color strokes,
 * butt caps with small gaps, center KPI, aria-labelled (WCAG).
 * Legends render as real text beside the chart (never color alone).
 */

export interface DonutSlice {
  label: string
  value: number
  color: string
}

export function DonutChart({
  slices,
  centerValue,
  centerLabel,
  ariaLabel,
  size = 160,
}: {
  slices: DonutSlice[]
  centerValue: string
  centerLabel: string
  ariaLabel: string
  size?: number
}) {
  const total = slices.reduce((sum, s) => sum + s.value, 0)
  const R = 60
  const C = 2 * Math.PI * R
  const GAP = 3 // px of breathing room between segments

  let acc = 0
  const segments = slices.map((s) => {
    const frac = s.value / total
    const seg = {
      ...s,
      len: Math.max(frac * C - GAP, 1),
      offset: -acc * C,
      frac,
    }
    acc += frac
    return seg
  })

  return (
    <svg
      role="img"
      aria-label={`${ariaLabel} — ${centerLabel} ${centerValue}`}
      viewBox="0 0 160 160"
      style={{ width: size, height: size }}
      className="shrink-0"
    >
      <circle cx="80" cy="80" r={R} fill="none" stroke="var(--color-surface-alt)" strokeWidth="18" />
      {segments.map((seg, i) => (
        <circle
          key={i}
          cx="80"
          cy="80"
          r={R}
          fill="none"
          stroke={seg.color}
          strokeWidth="18"
          strokeDasharray={`${seg.len} ${C - seg.len}`}
          strokeDashoffset={seg.offset}
          transform="rotate(-90 80 80)"
        />
      ))}
      <text
        x="80"
        y="77"
        textAnchor="middle"
        fontSize="21"
        fontWeight="600"
        fill="var(--color-ink)"
      >
        {centerValue}
      </text>
      <text
        x="80"
        y="96"
        textAnchor="middle"
        fontSize="10.5"
        fill="var(--color-mid-gray)"
      >
        {centerLabel}
      </text>
    </svg>
  )
}

/** Legend rows: color dot (decorative) + label + count + percent — real text. */
export function DonutLegend({ slices, total, fmt }: {
  slices: DonutSlice[]
  total: number
  fmt: Intl.NumberFormat
}) {
  return (
    <ul className="flex min-w-0 flex-1 flex-col gap-2.5">
      {slices.map((s) => {
        const pct = total > 0 ? Math.round((s.value / total) * 100) : 0
        return (
          <li key={s.label} className="flex items-center gap-2 text-body">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="min-w-0 flex-1 truncate text-mid-gray">{s.label}</span>
            <span className="font-semibold tabular-nums">{fmt.format(s.value)}</span>
            <span className="w-10 text-end text-caption tabular-nums text-mid-gray">{pct}%</span>
          </li>
        )
      })}
    </ul>
  )
}
