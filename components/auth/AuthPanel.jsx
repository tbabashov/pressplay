'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { PASSWORD_MIN } from '@/lib/password-rules'
import Link from 'next/link'

const GoogleMark = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-2.8-.4-4H24v7.3h12.1c-.2 2-1.6 5-4.5 7l6.9 5.4c4.1-3.8 6.6-9.4 6.6-15.7z"/>
    <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.4c-1.9 1.3-4.4 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-7.1 5.5C8 41.3 15.4 46 24 46z"/>
    <path fill="#FBBC05" d="M11.5 28.4c-.5-1.4-.7-2.9-.7-4.4s.3-3 .7-4.4l-7.1-5.5C2.9 17 2 20.4 2 24s.9 7 2.4 9.9l7.1-5.5z"/>
    <path fill="#EA4335" d="M24 10.5c4.1 0 6.9 1.8 8.5 3.2l6.2-6C34.9 4.2 29.9 2 24 2 15.4 2 8 6.7 4.4 14.1l7.1 5.5c1.8-5.3 6.7-9.1 12.5-9.1z"/>
  </svg>
)

export default function AuthPanel ({ next = '/app' }) {
  const [mode, setMode] = useState('in')          // 'in' to sign in, 'up' to register
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const up = mode === 'up'

  const swap = to => { setMode(to); setError('') }

  const submit = async e => {
    e.preventDefault()
    if (busy) return
    setBusy(true); setError('')

    try {
      if (up) {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email, password, name })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'That did not work.')
      }

      const result = await signIn('credentials', { email, password, redirect: false })
      // A wrong password and an unknown address give the same message on
      // purpose: the form is not a way to find out who has an account.
      if (!result || result.error) throw new Error('That email and password do not match.')

      router.push(next)
      router.refresh()
    } catch (e) {
      setError(e.message)
    } finally { setBusy(false) }
  }

  return (
    <div className="jn-panel">
      <h1 className="display jn-h1">
        {up ? 'Make an account.' : 'Welcome back.'}
      </h1>
      <p className="jn-sub">
        {up
          ? 'Score an album track by track, publish the review, and argue about it.'
          : 'Pick up where you left off.'}
      </p>

      <button className="jn-google" onClick={() => signIn('google', { callbackUrl: next })} disabled={busy}>
        <GoogleMark />
        Continue with Google
      </button>

      <div className="jn-or"><span>or</span></div>

      <form className="jn-form" onSubmit={submit}>
        {up && (
          <label className="jn-field">
            <span>Name</span>
            <input
              value={name} onChange={e => setName(e.target.value)}
              autoComplete="name" placeholder="What people should call you" maxLength={60}
            />
          </label>
        )}

        <label className="jn-field">
          <span>Email</span>
          <input
            type="email" required value={email} onChange={e => setEmail(e.target.value)}
            autoComplete="email" placeholder="you@example.com" spellCheck={false}
          />
        </label>

        <label className="jn-field">
          <span>Password</span>
          <input
            type="password" required value={password} onChange={e => setPassword(e.target.value)}
            autoComplete={up ? 'new-password' : 'current-password'}
            placeholder={up ? `At least ${PASSWORD_MIN} characters` : 'Your password'}
            minLength={up ? PASSWORD_MIN : undefined}
          />
        </label>

        {error && <p className="jn-error">{error}</p>}

        <button type="submit" className="btn-primary jn-submit" disabled={busy}>
          {busy ? 'One moment' : up ? 'Create account' : 'Sign in'}
        </button>
      </form>

      {/* Only on the sign-in side. Offering a password reset to somebody in the
          middle of creating an account is a question they cannot have. */}
      {!up && (
        <p className="jn-forgot">
          <Link href="/forgot">Forgotten your password?</Link>
        </p>
      )}

      <p className="jn-swap">
        {up
          ? <>Already have an account? <button onClick={() => swap('in')}>Sign in</button></>
          : <>No account yet? <button onClick={() => swap('up')}>Create one</button></>}
      </p>
    </div>
  )
}
