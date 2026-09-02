import Link from 'next/link'
import Mark from '@/components/Mark'
import '../legal.css'

// The three documents share a shell so they read as one set rather than three
// pages that happen to be plain.
export default function LegalLayout ({ children }) {
  return (
    <div className="lg">
      <header className="lg-top">
        <Link href="/" className="lg-mark">
          <Mark size={19} />
          <strong>Press Play</strong>
        </Link>
        <nav className="lg-nav">
          <Link href="/legal/terms">Terms</Link>
          <Link href="/legal/privacy">Privacy</Link>
          <Link href="/legal/cookies">Cookies</Link>
        </nav>
      </header>
      <main className="lg-body">{children}</main>
      <footer className="lg-foot">
        <Link href="/">Back to Press Play</Link>
      </footer>
    </div>
  )
}
