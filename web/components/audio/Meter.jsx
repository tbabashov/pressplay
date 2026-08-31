'use client'

import { useEffect, useRef } from 'react'
import { usePlayer } from './Player'

// A real spectrum, drawn from the analyser. Bars are mirrored from the centre so
// the meter reads as one object rather than a left-to-right graph.
export default function Meter ({ bars = 21, className = '' }) {
  const { analyser, playing } = usePlayer()
  const wrap = useRef(null)

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const kids = [...el.children]
    if (!playing || !analyser?.current) {
      kids.forEach(k => { k.style.transform = 'scaleY(0.06)' })
      return
    }
    const an = analyser.current
    const data = new Uint8Array(an.frequencyBinCount)
    const half = Math.ceil(bars / 2)
    let raf = 0
    const tick = () => {
      an.getByteFrequencyData(data)
      for (let i = 0; i < half; i++) {
        // Log-ish spacing so the low end does not eat the whole meter.
        const idx = Math.min(data.length - 1, Math.round(Math.pow(i / half, 1.6) * data.length * 0.62))
        const v = Math.max(0.06, (data[idx] / 255) ** 0.85)
        const mid = Math.floor(bars / 2)
        const a = kids[mid - i], b = kids[mid + i]
        if (a) a.style.transform = `scaleY(${v.toFixed(3)})`
        if (b) b.style.transform = `scaleY(${v.toFixed(3)})`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, analyser, bars])

  return (
    <div className={`meter ${className}`} ref={wrap} aria-hidden="true">
      {Array.from({ length: bars }, (_, i) => <i key={i} />)}
    </div>
  )
}
