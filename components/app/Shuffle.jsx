'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

// Asks the server for another set. The order is drawn per render, so a refresh
// is a reshuffle: there is no separate endpoint to keep in step with the page,
// and what comes back went through exactly the same code that filled the strip
// in the first place.
export default function Shuffle () {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [spun, setSpun] = useState(0)

  return (
    <button
      type="button"
      className={`sg-shuffle${pending ? ' busy' : ''}`}
      onClick={() => { setSpun(n => n + 1); start(() => router.refresh()) }}
      disabled={pending}
      aria-label="Show me different suggestions"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" style={{ rotate: `${spun * 180}deg` }}>
        <path d="M4 9a8 8 0 0 1 13.7-5.6L20 6M20 15a8 8 0 0 1-13.7 5.6L4 18"
          fill="none" stroke="currentColor" strokeWidth="1.9"
          strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 3v3.4h-3.4M4 21v-3.4h3.4"
          fill="none" stroke="currentColor" strokeWidth="1.9"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {pending ? 'Shuffling' : 'Shuffle'}
    </button>
  )
}
