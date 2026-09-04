'use client'

import { useEffect, useRef, useState } from 'react'

// Text that drifts sideways, but only when it has to.
//
// The player ellipsised long titles, and the end of a title is often the part
// that tells two versions of a song apart — the remix, the live take, who it is
// with. This measures the text against its box and animates only when there is
// something hidden: anything that already fits must never move, or the player
// fidgets at rest.
//
// Reduced motion is answered by not running at all rather than by a shorter
// animation, and the ellipsis comes back in that case, so the fallback is the
// behaviour this replaced rather than a silently clipped word.
export default function Marquee ({ children, className = '' }) {
  const box = useRef(null)
  const text = useRef(null)
  const [distance, setDistance] = useState(0)

  useEffect(() => {
    const b = box.current
    const t = text.current
    if (!b || !t) return

    const still = window.matchMedia('(prefers-reduced-motion: reduce)')
    const measure = () => {
      // Sub-pixel widths round against us: a title that fits can measure a
      // fraction over and scroll by half a pixel forever. Two pixels of slack.
      const over = Math.ceil(t.scrollWidth - b.clientWidth)
      setDistance(still.matches || over <= 2 ? 0 : over)
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(b)
    still.addEventListener('change', measure)
    return () => { ro.disconnect(); still.removeEventListener('change', measure) }
  }, [children])

  const running = distance > 0

  return (
    <div className={`mq ${className}`} ref={box}>
      <span
        ref={text}
        className={running ? 'mq-run' : ''}
        // Constant speed rather than constant duration, so a title twice as
        // long takes twice as long instead of scrolling twice as fast.
        style={running ? { '--mq-d': `${distance}px`, '--mq-t': `${(distance / 22 + 3.4).toFixed(2)}s` } : undefined}
      >
        {children}
      </span>
    </div>
  )
}
