'use client'

import { useEffect, useState } from 'react'

// Appears once there is enough page behind you to be worth undoing, and only
// then: a control that is always there is a control in the way.
export default function ToTop () {
  const [show, setShow] = useState(false)

  useEffect(() => {
    let queued = false
    const onScroll = () => {
      if (queued) return
      queued = true
      requestAnimationFrame(() => {
        queued = false
        setShow(window.scrollY > window.innerHeight * 1.2)
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      className={`totop${show ? ' on' : ''}`}
      onClick={() => window.scrollTo({
        top: 0,
        // Respect the reader's setting rather than overriding it with a long
        // scroll they did not ask for.
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      })}
      aria-label="Back to the top"
      tabIndex={show ? 0 : -1}
      aria-hidden={!show}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 19V6m0 0-6 6m6-6 6 6" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
