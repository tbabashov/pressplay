'use client'

import { useEffect } from 'react'

// Grain, vignette and the light that breathes with the music, plus the single
// reveal observer the whole page shares.
export default function Atmosphere () {
  useEffect(() => {
    const els = document.querySelectorAll('.rv')
    if (!els.length) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach(el => el.classList.add('in'))
      return
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) }
      })
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 })
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <>
      <div className="roomlight" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
    </>
  )
}
