import { Archivo, Bricolage_Grotesque, Fraunces, Space_Grotesk, Archivo_Black, Outfit } from 'next/font/google'
import './globals.css'
import './immersive.css'
import PlayerProvider from '../components/audio/Player'
import NowPlaying from '../components/audio/NowPlaying'
import Atmosphere from '../components/Atmosphere'
import ToTop from '../components/ToTop'
import CookieBanner from '@/components/CookieBanner'
import { Analytics } from '@vercel/analytics/next'
import { SITE_URL } from '@/lib/site-url'

// One family, self-hosted at build time. The width axis carries the display voice,
// so there is no second face and nothing borrowed from the platform sans.
const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  display: 'swap',
  variable: '--font-archivo'
})

// Headlines only. Archivo is a good workhorse and a forgettable headline, so the
// display voice comes from a face with actual quirks in it: Bricolage carries a
// wobble at large sizes that reads as editorial rather than dashboard. Body text
// stays on Archivo, and the export frames are untouched.
const display = Bricolage_Grotesque({
  subsets: ['latin'],
  axes: ['wdth', 'opsz'],
  display: 'swap',
  variable: '--font-display'
})

// Export styles are separate design languages, so each one gets its own voice
// rather than a weight of the same face. Self-hosted by next/font, which is
// what lets the rasteriser inline them.
// Instrument Serif ships one weight, 400, so every heavier weight the paper
// style asked for did nothing and the headline came out as thin as the body.
// Fraunces is variable across 100-900 and carries an optical size axis, which
// is what lets one family set both a broadsheet headline and a legible row.
const serif = Fraunces({
  subsets: ['latin'], axes: ['SOFT', 'WONK', 'opsz'],
  display: 'swap', variable: '--font-serif'
})
// The mono style is monochrome, not monospace, the name is about colour. A
// typewriter face was fighting that rather than saying it, so this is a
// grotesque with enough character to carry a near-empty page.
const mono = Space_Grotesk({
  subsets: ['latin'], weight: ['400', '500', '600', '700'],
  display: 'swap', variable: '--font-mono'
})
const poster = Archivo_Black({
  subsets: ['latin'], weight: ['400'],
  display: 'swap', variable: '--font-poster'
})
// Aurora was set in the same face as the app itself, which is why it read as
// the house style with the lights turned up. Outfit is geometric and open,
// which is what that style is actually about.
const glow = Outfit({
  subsets: ['latin'], display: 'swap', variable: '--font-glow'
})

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Press Play Rankings. An average is not an opinion.',
    template: '%s · Press Play Rankings'
  },
  description:
    'Rate an album properly. Score every song on a scale you build, weigh six criteria, ' +
    'and land on one number you can defend. Then export it as the post.',
  robots: { index: true, follow: true },
  // The tab carries the product's own mark, which lives at app/icon.svg and is
  // the same ring and triangle as the wordmark. The headphones logo names the
  // TikTok account and stays on the link to it.
  openGraph: {
    title: 'Press Play Rankings',
    description: 'Every song scored on the scale you built. One number you can defend.',
    type: 'website',
    images: ['/photos/mark.png']
  }
}

export const viewport = {
  themeColor: '#08080a',
  colorScheme: 'dark'
}

export default function RootLayout ({ children }) {
  return (
    <html lang="en" className={`${archivo.variable} ${display.variable} ${serif.variable} ${mono.variable} ${poster.variable} ${glow.variable}`}>
      <body style={{ fontFamily: 'var(--font-archivo), system-ui, sans-serif' }}>
        <PlayerProvider>
          <Atmosphere />
          {children}
          <NowPlaying />
          <ToTop />
          <CookieBanner />
          {/* Page counts, from Vercel. It reports only from a deployment, so
              this is inert in development. No cookie and no stored id, which is
              why it sits outside the banner's optional-storage gate. */}
          <Analytics />
        </PlayerProvider>
      </body>
    </html>
  )
}
