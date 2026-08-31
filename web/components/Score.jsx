import { ratingColor } from '@/lib/rating-colors'

// The one saturated element on any surface. Same ladder as the exporter.
export default function Score ({ value, size = 'md', decimals = 1 }) {
  const c = ratingColor(typeof value === 'number' ? Math.round(value) : value)
  const dims = {
    sm: { h: 30, fs: 15, px: 10, r: 9 },
    md: { h: 44, fs: 22, px: 14, r: 13 },
    lg: { h: 74, fs: 40, px: 22, r: 20 },
    xl: { h: 116, fs: 66, px: 30, r: 30 }
  }[size]
  return (
    <span
      className="tnum"
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        height: dims.h, padding: `0 ${dims.px}px`, borderRadius: dims.r,
        fontSize: dims.fs, fontWeight: 800, letterSpacing: '-0.02em',
        background: c.bg, color: c.fg, flexShrink: 0,
        boxShadow: c.glow ? `0 0 ${dims.h * 0.7}px ${c.glow}` : 'none'
      }}
    >
      {typeof value === 'number' ? value.toFixed(decimals) : value}
    </span>
  )
}
