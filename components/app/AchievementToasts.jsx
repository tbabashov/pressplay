'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

// Checked when you land somewhere new, because that is when something has just
// happened: a rating saved, a reply posted, a vote taken. Polling on a timer
// would ask far more often for an answer that changes a few times a week.
export default function AchievementToasts () {
  const path = usePathname()
  const [queue, setQueue] = useState([])

  useEffect(() => {
    let alive = true
    const id = setTimeout(() => {
      fetch('/api/achievements')
        .then(r => (r.ok ? r.json() : null))
        .then(d => { if (alive && d?.earned?.length) setQueue(q => [...q, ...d.earned]) })
        .catch(() => {})
    }, 900)   // let the page settle first; this is never urgent
    return () => { alive = false; clearTimeout(id) }
  }, [path])

  // Each one shows for a while and then goes on its own. Earning several at
  // once queues them rather than stacking a wall of cards.
  useEffect(() => {
    if (!queue.length) return
    const id = setTimeout(() => setQueue(q => q.slice(1)), 6000)
    return () => clearTimeout(id)
  }, [queue])

  if (!queue.length) return null
  const a = queue[0]

  return (
    <div className="ach-toast" role="status" aria-live="polite">
      <span className="ach-toast-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none"
          stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
      <span className="ach-toast-text">
        <em>Achievement unlocked</em>
        <strong>{a.name}</strong>
        <span>{a.about}</span>
      </span>
      <button onClick={() => setQueue(q => q.slice(1))} aria-label="Dismiss">
        <svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11m0-11l-11 11" fill="none"
          stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
      </button>
      {queue.length > 1 && <span className="ach-toast-more">+{queue.length - 1}</span>}
    </div>
  )
}
