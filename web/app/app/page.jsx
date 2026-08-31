import { redirect } from 'next/navigation'
import { auth, signOut } from '@/auth'
import '../landing.css'

export const metadata = { title: 'Your library' }

// Placeholder for the rating tool. It exists so the primary call to action
// leads somewhere real instead of doing nothing, and it is gated properly.
export default async function AppHome () {
  const session = await auth()
  if (!session?.user) redirect('/')
  const { name, email, role } = session.user

  return (
    <main className="apphome">
      <div className="shell apphome-inner">
        <h1 className="display h2">You&rsquo;re in, {(name || '').split(' ')[0]}.</h1>
        <p className="lede measure">
          The rating tool is being rebuilt on this account system right now. Nothing you do
          here is saved yet, because there is no database behind it.
        </p>
        <dl className="apphome-facts">
          <div><dt>Signed in as</dt><dd>{email}</dd></div>
          <div><dt>Role</dt><dd>{role === 'owner' ? 'Owner, full access' : 'Member'}</dd></div>
          <div><dt>Daily limit</dt><dd>{role === 'owner' ? 'None' : '3 albums'}</dd></div>
        </dl>
        <div className="apphome-cta">
          <a className="btn-ghost" href="/">Back to the site</a>
          <form action={async () => { 'use server'; await signOut({ redirectTo: '/' }) }}>
            <button type="submit" className="btn-ghost">Sign out</button>
          </form>
        </div>
      </div>
    </main>
  )
}
