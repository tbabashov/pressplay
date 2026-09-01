import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import AuthPanel from '@/components/auth/AuthPanel'
import Mark from '@/components/Mark'
import wall from '@/lib/wall.json'
import '../join.css'

export const metadata = {
  title: 'Sign in',
  description: 'Sign in to Press Play Rankings, or make an account.',
  robots: { index: false, follow: false }
}

export default async function Join () {
  const session = await auth()
  if (session?.user) redirect('/app')

  // Real covers, never decorative stock. Fixed slice so the server and the
  // client build the same grid. Swap this panel for a video whenever there is
  // one worth showing: it is the only thing on the page that is a placeholder.
  const covers = wall.slice(0, 24)

  return (
    <div className="jn">
      <div className="jn-left">
        <Link href="/" className="jn-mark">
          <Mark size={19} />
          <strong>Press Play</strong>
        </Link>

        <AuthPanel />

        <p className="jn-legal">
          By continuing you agree that your published reviews are public.
        </p>
      </div>

      <aside className="jn-right" aria-hidden="true">
        <div className="jn-grid">
          {covers.map(a => (
            <img key={a.cover} src={a.cover} alt="" width="150" height="150" loading="lazy" />
          ))}
        </div>
        <div className="jn-veil" />
        <blockquote className="jn-quote">
          <p className="display">An average is not an opinion.</p>
          <cite>Every song scored. Six criteria weighed. One number you can defend.</cite>
        </blockquote>
      </aside>
    </div>
  )
}
