'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const ICONS = {
  rate: <path d="M12 3.6a8.4 8.4 0 1 0 0 16.8 8.4 8.4 0 0 0 0-16.8Zm-1.4 5.1 4.6 3.3-4.6 3.3Z" />,
  library: <path d="M4.2 4.6h3.1v14.8H4.2Zm4.9 0h3.1v14.8H9.1Zm5.2.5 2.9-.8 3.6 14.3-2.9.8Z" />,
  board: <path d="M4 13.4h3.6V20H4Zm6.2-6.8h3.6V20h-3.6ZM16.4 10H20v10h-3.6Z" />,
  stats: <path d="M4.6 18.2 9.4 12l3.5 3.4 6.3-8.2 1.5 1.2-7.6 9.9-3.5-3.4-3.6 4.6Z" />,
  disc: <path d="M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6Zm0 6.6a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4Z" />,
  feed: <path d="M9 4.4a3.3 3.3 0 1 1 0 6.6 3.3 3.3 0 0 1 0-6.6Zm7.4 1.2a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2ZM9 12.6c3.2 0 5.8 1.6 5.8 3.6v3H3.2v-3c0-2 2.6-3.6 5.8-3.6Zm7.4.4c2.4 0 4.4 1.3 4.4 2.9v2.9h-4.6v-2.6c0-1.2-.6-2.3-1.6-3.1a8 8 0 0 1 1.8-.1Z" />,
  profile: <path d="M12 4.2a3.9 3.9 0 1 1 0 7.8 3.9 3.9 0 0 1 0-7.8Zm0 9.4c4 0 7.2 2 7.2 4.4v1.8H4.8V18c0-2.4 3.2-4.4 7.2-4.4Z" />,
  // A ladder of rungs getting shorter: the scale, which is what this one is
  // mostly about. Not the vertical bars of the leaderboard or the line of the
  // taste chart, so the three do not read as each other at rail size.
  scoring: <path d="M4 5h16v2.6H4Zm0 5.7h11.4v2.6H4Zm0 5.7h6.8v2.6H4Z" />
}

const LINKS = [
  ['/app', 'Rate', 'rate'],
  ['/app/library', 'Library', 'library'],
  ['/app/board', 'Leaderboard', 'board'],
  ['/app/discography', 'Discographies', 'disc'],
  ['/app/stats', 'Taste', 'stats'],
  ['/app/feed', 'Social', 'feed'],
  ['/app/scoring', 'Scoring', 'scoring'],
  ['/app/settings', 'Profile', 'profile']
]

// On a phone the sidebar became a strip that scrolled sideways, which put four
// of the seven destinations off the edge where nobody would ever find them. A
// phone gets a tab bar instead: four fixed tabs and a More sheet holding the
// rest, so nothing is hidden and nothing has to be scrolled to.
const TABS = ['/app', '/app/library', '/app/board', '/app/feed']
// A tab label has about nine characters before it starts crowding its
// neighbour, so the long ones get a short name here rather than being
// truncated or wrapped.
const TAB_LABEL = { '/app/board': 'Ranks' }
// Profile is not here: the account chip in the top bar is on every screen and
// opens straight onto it, so a row for it was the same destination twice.
const MORE = ['/app/discography', '/app/stats', '/app/scoring']

export default function Rail ({ image, name }) {
  const path = usePathname()
  const initial = (name || '?').trim()[0]?.toUpperCase() || '?'
  const [more, setMore] = useState(false)
  const on = href => (href === '/app' ? path === '/app' : path.startsWith(href))
  const byHref = Object.fromEntries(LINKS.map(l => [l[0], l]))
  const moreActive = MORE.some(on)

  // Any navigation closes the sheet, including a back gesture.
  useEffect(() => { setMore(false) }, [path])

  return (
    <>
    <nav className="rail" aria-label="Sections">
      {LINKS.map(([href, label, icon]) => {
        const on = href === '/app' ? path === '/app' : path.startsWith(href)
        return (
          <Link key={href} href={href} className={`rail-item${on ? ' on' : ''}`} aria-current={on ? 'page' : undefined}>
            {icon === 'profile' && (image || name)
              ? (image
                  ? <img className="rail-pfp" src={image} alt="" width="20" height="20" referrerPolicy="no-referrer" />
                  : <span className="rail-pfp rail-pfp-blank" aria-hidden="true">{initial}</span>)
              : <svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[icon]}</svg>}
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
      {/* The phone navigation. Rendered next to the rail rather than instead
          of it, so which one is showing is a question of width and not of a
          media query guess made in JavaScript. */}
      <nav className="tabbar" aria-label="Sections">
        {TABS.map(href => {
          const [, label, icon] = byHref[href]
          return (
            <Link key={href} href={href} className={`tab${on(href) ? ' on' : ''}`}
              aria-current={on(href) ? 'page' : undefined}>
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">{ICONS[icon]}</svg>
              <span>{TAB_LABEL[href] || label}</span>
            </Link>
          )
        })}
        <button
          className={`tab${moreActive || more ? ' on' : ''}`}
          onClick={() => setMore(v => !v)}
          aria-expanded={more}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
            <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
          </svg>
          <span>More</span>
        </button>
      </nav>

      {more && (
        <>
          <button className="sheet-scrim" onClick={() => setMore(false)} aria-label="Close" />
          <div className="sheet" role="dialog" aria-label="More sections">
            <span className="sheet-grab" aria-hidden="true" />
            {MORE.map(href => {
              const [, label, icon] = byHref[href]
              return (
                <Link key={href} href={href} className={`sheet-row${on(href) ? ' on' : ''}`}>
                  <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">{ICONS[icon]}</svg>
                  {label}
                </Link>
              )
            })}
            {/* Named for what it is here rather than for the page it opens.
                In a list of places to go, next to Taste and Scoring, "Tiers"
                reads like another part of the rating model. */}
            <Link href="/tiers" className="sheet-row">
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                <path d="M12 3.4 14.6 9l6.1.6-4.6 4.1 1.3 6L12 16.6 6.6 19.7l1.3-6L3.3 9.6 9.4 9Z" />
              </svg>
              Subscriptions
            </Link>
          </div>
        </>
      )}
    </>
  )
}
