'use client'

import { useEffect, useRef, useState } from 'react'
import Mark from './Mark'

// Sits flush at the top of the page, then contracts into a floating pill once
// you start scrolling, so it stops competing with the content behind it.
export default function Nav ({ children }) {
  const [stuck, setStuck] = useState(false)
  const [open, setOpen] = useState(false)
  const raf = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      if (raf.current) return
      raf.current = requestAnimationFrame(() => {
        raf.current = 0
        setStuck(window.scrollY > 24)
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf.current) }
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const links = [
    ['#how', 'How it works'], ['#reviews', 'Reviews'],
    ['#export', 'Export'], ['#tiktok', 'TikTok'], ['#tiers', 'Tiers']
  ]

  return (
    <>
      <div className={`nav-wrap${stuck ? ' stuck' : ''}`}>
        <nav className="nav">
          <a className="wordmark" href="/" aria-label="Press Play Rankings, home">
            <Mark size={18} />
            <span>Press&nbsp;Play</span>
          </a>
          <div className="nav-links">
            {links.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
          </div>
          <div className="nav-end">{children}</div>
          <button
            className="nav-burger" aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open} onClick={() => setOpen(v => !v)}
          >
            <span /><span />
          </button>
        </nav>
      </div>

      <div className={`sheet${open ? ' open' : ''}`} role="dialog" aria-modal="true" aria-label="Menu">
        <div className="sheet-links">
          {links.map(([href, label]) => (
            <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>
          ))}
        </div>
        <div className="sheet-end">{children}</div>
      </div>
    </>
  )
}
