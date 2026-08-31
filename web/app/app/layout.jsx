import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth, signOut } from '@/auth'
import Rail from '@/components/app/Rail'
import '../app.css'

export const metadata = { title: 'Your library' }

export default async function AppLayout ({ children }) {
  const session = await auth()
  if (!session?.user) redirect('/')
  const { name, image, role } = session.user
  const first = (name || '').split(' ')[0]

  return (
    <div className="app">
      <header className="topbar">
        <Link href="/" className="topbar-mark">
          <svg width="19" height="19" viewBox="0 0 18 18" aria-hidden="true">
            <circle cx="9" cy="9" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M6.9 5.6v5.8l4.5-2.9z" fill="currentColor" />
          </svg>
          <strong>Press Play</strong>
        </Link>

        <div className="topbar-end">
          {role === 'owner' && <span className="chip-owner">Owner</span>}
          <span className="topbar-who">
            {image
              ? <img src={image} alt="" width="26" height="26" referrerPolicy="no-referrer" />
              : <i aria-hidden="true">{(first[0] || '?').toUpperCase()}</i>}
            {first}
          </span>
          <form action={async () => { 'use server'; await signOut({ redirectTo: '/' }) }}>
            <button type="submit" className="topbar-out">Sign out</button>
          </form>
        </div>
      </header>

      <div className="app-body">
        <Rail />
        <main className="app-main">{children}</main>
      </div>
    </div>
  )
}
