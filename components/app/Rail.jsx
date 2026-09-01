'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

const ICONS = {
  rate: <path d="M12 3.6a8.4 8.4 0 1 0 0 16.8 8.4 8.4 0 0 0 0-16.8Zm-1.4 5.1 4.6 3.3-4.6 3.3Z" />,
  library: <path d="M4.2 4.6h3.1v14.8H4.2Zm4.9 0h3.1v14.8H9.1Zm5.2.5 2.9-.8 3.6 14.3-2.9.8Z" />,
  board: <path d="M4 13.4h3.6V20H4Zm6.2-6.8h3.6V20h-3.6ZM16.4 10H20v10h-3.6Z" />,
  stats: <path d="M4.6 18.2 9.4 12l3.5 3.4 6.3-8.2 1.5 1.2-7.6 9.9-3.5-3.4-3.6 4.6Z" />,
  disc: <path d="M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6Zm0 6.6a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4Z" />,
  feed: <path d="M9 4.4a3.3 3.3 0 1 1 0 6.6 3.3 3.3 0 0 1 0-6.6Zm7.4 1.2a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2ZM9 12.6c3.2 0 5.8 1.6 5.8 3.6v3H3.2v-3c0-2 2.6-3.6 5.8-3.6Zm7.4.4c2.4 0 4.4 1.3 4.4 2.9v2.9h-4.6v-2.6c0-1.2-.6-2.3-1.6-3.1a8 8 0 0 1 1.8-.1Z" />,
  profile: <path d="M12 4.2a3.9 3.9 0 1 1 0 7.8 3.9 3.9 0 0 1 0-7.8Zm0 9.4c4 0 7.2 2 7.2 4.4v1.8H4.8V18c0-2.4 3.2-4.4 7.2-4.4Z" />
}

const LINKS = [
  ['/app', 'Rate', 'rate'],
  ['/app/library', 'Library', 'library'],
  ['/app/board', 'Leaderboard', 'board'],
  ['/app/discography', 'Discographies', 'disc'],
  ['/app/stats', 'Taste', 'stats'],
  ['/app/feed', 'Following', 'feed'],
  ['/app/settings', 'Profile', 'profile']
]

export default function Rail ({ image, name }) {
  const path = usePathname()
  const initial = (name || '?').trim()[0]?.toUpperCase() || '?'
  return (
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
  )
}
