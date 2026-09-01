'use client'

import { useEffect } from 'react'

// Grain, vignette and the light that breathes with the music, plus the reveal
// the whole page shares.
export default function Atmosphere () {
  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const show = el => el.classList.add('in')

    if (reduce) {
      document.querySelectorAll('.rv').forEach(show)
      return
    }

    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target) } })
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 })

    document.querySelectorAll('.rv').forEach(el => io.observe(el))

    // Safety net. A fast flick, a smooth-scrolled anchor jump, or a layout shift
    // can all let an element pass through the viewport without the observer
    // delivering a record for it, and the cost of that is text nobody can read
    // until they reload. Anything already scrolled past is revealed outright.
    let queued = false
    const sweep = () => {
      queued = false
      const limit = window.innerHeight
      document.querySelectorAll('.rv:not(.in)').forEach(el => {
        if (el.getBoundingClientRect().top < limit) { show(el); io.unobserve(el) }
      })
    }
    const onScroll = () => {
      if (queued) return
      queued = true
      requestAnimationFrame(sweep)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    // Catch anything already on screen before the first scroll.
    const settle = setTimeout(sweep, 400)

    return () => {
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      clearTimeout(settle)
    }
  }, [])

  return (
    <>
      <div className="roomlight" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
    </>
  )
}
