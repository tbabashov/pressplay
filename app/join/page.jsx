import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import AuthPanel from '@/components/auth/AuthPanel'
import Mark from '@/components/Mark'
import AuthAside from '@/components/auth/AuthAside'
import '../join.css'

export const metadata = {
  title: 'Sign in',
  description: 'Sign in to Press Play Rankings, or make an account.',
  robots: { index: false, follow: false }
}

export default async function Join () {
  const session = await auth()
  if (session?.user) redirect('/app')


  return (
    <div className="jn">
      <div className="jn-left">
        <Link href="/" className="jn-mark">
          <Mark size={19} />
          <strong>Press Play</strong>
        </Link>

        <AuthPanel />

      </div>

      <AuthAside />
    </div>
  )
}
