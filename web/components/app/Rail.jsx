'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

const ICONS = {
  rate: <path d="M12 3.6a8.4 8.4 0 1 0 0 16.8 8.4 8.4 0 0 0 0-16.8Zm-1.4 5.1 4.6 3.3-4.6 3.3Z" />,
  library: <path d="M4.2 4.6h3.1v14.8H4.2Zm4.9 0h3.1v14.8H9.1Zm5.2.5 2.9-.8 3.6 14.3-2.9.8Z" />,
  board: <path d="M4 13.4h3.6V20H4Zm6.2-6.8h3.6V20h-3.6ZM16.4 10H20v10h-3.6Z" />,
  stats: <path d="M4.6 18.2 9.4 12l3.5 3.4 6.3-8.2 1.5 1.2-7.6 9.9-3.5-3.4-3.6 4.6Z" />
}

const LINKS = [
  ['/app', 'Rate', 'rate'],
  ['/app/library', 'Library', 'library'],
  ['/app/board', 'Leaderboard', 'board'],
  ['/app/stats', 'Taste', 'stats']
]

export default function Rail () {
  const path = usePathname()
  return (
    <nav className="rail" aria-label="Sections">
      {LINKS.map(([href, label, icon]) => {
        const on = href === '/app' ? path === '/app' : path.startsWith(href)
        return (
          <Link key={href} href={href} className={`rail-item${on ? ' on' : ''}`} aria-current={on ? 'page' : undefined}>
            <svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[icon]}</svg>
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
