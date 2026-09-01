'use client'

import { useEffect } from 'react'
import { coverColour } from '@/lib/palette'

// Rule one in DESIGN.md is that colour comes from the record on screen, and the
// app was the only place ignoring it: every screen sat on flat near-black while
// the exported frames are lit by the album they describe. A screen showing many
// albums takes its colour from the one at the top, so a library of Kanye reads
// differently from a library of Radiohead.
//
// Nothing is painted until the colour resolves, so there is no flash of a
// default hue on load, and the player overrides it the moment something plays.
export default function AlbumTint ({ cover }) {
  useEffect(() => {
    if (!cover) return
    let dead = false
    coverColour(cover).then(rgb => {
      if (dead || !rgb) return
      const r = document.documentElement
      r.style.setProperty('--accent', `rgb(${rgb})`)
      r.style.setProperty('--accent-rgb', rgb)
      r.style.setProperty('--accent-soft', `rgba(${rgb}, 0.34)`)
    })
    return () => { dead = true }
  }, [cover])

  return null
}
