import { Archivo, Bricolage_Grotesque, Instrument_Serif, IBM_Plex_Mono, Archivo_Black } from 'next/font/google'
import './globals.css'
import './immersive.css'
import PlayerProvider from '../components/audio/Player'
import NowPlaying from '../components/audio/NowPlaying'
import Atmosphere from '../components/Atmosphere'

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
const serif = Instrument_Serif({
  subsets: ['latin'], weight: ['400'], style: ['normal', 'italic'],
  display: 'swap', variable: '--font-serif'
})
const mono = IBM_Plex_Mono({
  subsets: ['latin'], weight: ['400', '500', '600', '700'],
  display: 'swap', variable: '--font-mono'
})
const poster = Archivo_Black({
  subsets: ['latin'], weight: ['400'],
  display: 'swap', variable: '--font-poster'
})

export const metadata = {
  metadataBase: new URL('https://pressplayrankings.com'),
  title: {
    default: 'Press Play Rankings. An average is not an opinion.',
    template: '%s · Press Play Rankings'
  },
  description:
    'Rate an album properly. Score every song on a scale you build, weigh six criteria, ' +
    'and land on one number you can defend. Then export it as the post.',
  robots: { index: true, follow: true },
  // The account's own mark, so a tab and a shared link carry it.
  icons: { icon: '/photos/mark.png', apple: '/photos/mark.png' },
  openGraph: {
    title: 'Press Play Rankings',
    description: 'Every song scored. Six criteria weighed. One number you can defend.',
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
    <html lang="en" className={`${archivo.variable} ${display.variable} ${serif.variable} ${mono.variable} ${poster.variable}`}>
      <body style={{ fontFamily: 'var(--font-archivo), system-ui, sans-serif' }}>
        <PlayerProvider>
          <Atmosphere />
          {children}
          <NowPlaying />
        </PlayerProvider>
      </body>
    </html>
  )
}
