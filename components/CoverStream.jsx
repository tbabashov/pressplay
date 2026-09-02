'use client'

import wall from '@/lib/wall.json'

// The covers behind the tiers, moving. Two identical columns of the same list
// stacked end to end and translated by exactly half the pair's height, so the
// loop closes on itself and nothing jumps at the seam. Real covers, never
// decorative stock.
//
// Respecting prefers-reduced-motion is not politeness here: a full screen of
// drifting artwork behind text is exactly the thing that setting exists for.
const COLUMNS = 6
const PER_COLUMN = 14

export default function CoverStream () {
  const columns = Array.from({ length: COLUMNS }, (_, c) =>
    Array.from({ length: PER_COLUMN }, (_, i) => wall[(c * PER_COLUMN + i) % wall.length])
  )

  return (
    <div className="cs" aria-hidden="true">
      <div className="cs-cols">
        {columns.map((col, c) => (
          <div
            key={c}
            className="cs-col"
            // Alternating speeds, so the wall reads as depth rather than as one
            // sheet sliding past.
            style={{ animationDuration: `${52 + (c % 3) * 16}s` }}
          >
            {[...col, ...col].map((a, i) => (
              <img key={`${a.cover}:${i}`} src={a.cover} alt="" loading="lazy" width="200" height="200" />
            ))}
          </div>
        ))}
      </div>
      <div className="cs-veil" />
    </div>
  )
}
