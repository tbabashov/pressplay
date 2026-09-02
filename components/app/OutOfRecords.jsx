'use client'

import { useState } from 'react'
import Link from 'next/link'
import Paywall from './Paywall'

// The export screen when the day is spent. The subscription screen comes up
// over it rather than replacing the page, so closing it leaves somewhere to
// stand rather than a blank route.
export default function OutOfRecords ({ tier, used, limit, albumId }) {
  const [wall, setWall] = useState(true)
  return (
    <>
      {wall && (
        <Paywall tier={tier} used={used} limit={limit} onClose={() => setWall(false)} />
      )}
      <div className="page-head"><h1>That is today</h1></div>
      <div className="soon-panel">
        <p>
          {used} of {limit} records turned into slides today. It resets at midnight, and nothing
          you have rated is going anywhere. Records you already built today can still be opened
          and downloaded as many times as you like.
        </p>
        <div className="oor-do">
          <button className="btn-primary" onClick={() => setWall(true)}>See the tiers</button>
          <Link className="btn-ghost" href={`/app/rate/${encodeURIComponent(albumId)}`}>
            Back to the rating
          </Link>
        </div>
      </div>
    </>
  )
}
