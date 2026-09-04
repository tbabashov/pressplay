import Link from 'next/link'
import Mark from '@/components/Mark'
import AuthAside from '@/components/auth/AuthAside'
import '../join.css'
import ForgotForm from '@/components/social/ForgotForm'

export const metadata = { title: 'Forgotten password' }

export default function ForgotPage () {
  return (
    <div className="jn">
      <div className="jn-left">
        <Link href="/" className="jn-mark">
          <Mark size={19} />
          <strong>Press Play</strong>
        </Link>

        <div className="jn-panel">
          <h1 className="jn-h1 display">Forgotten your password?</h1>
          <p className="jn-sub">
            Give us the address you signed up with and we will send a link that lets you set a
            new one. If you only ever signed in with Google there is nothing here to reset, so
            use the Google button, and you can add a password from your profile afterwards.
          </p>
          <ForgotForm />
        </div>

        <p className="jn-legal">
          <Link href="/join">Back to signing in</Link>
        </p>
      </div>

      <AuthAside line="Locked out is not gone." under="Your ratings, your criteria and your scale are exactly where you left them." />
    </div>
  )
}
