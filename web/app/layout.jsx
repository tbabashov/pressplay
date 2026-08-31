import { Archivo } from 'next/font/google'
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

export const metadata = {
  metadataBase: new URL('https://pressplayrankings.com'),
  title: {
    default: 'Press Play Rankings. An average is not an opinion.',
    template: '%s · Press Play Rankings'
  },
  description:
    'Rate an album properly. Score every song on a scale you build, weigh six criteria, ' +
    'and land on one number you can defend. Then export it as the post.',
  openGraph: {
    title: 'Press Play Rankings',
    description: 'Every song scored. Six criteria weighed. One number you can defend.',
    type: 'website'
  },
  robots: { index: true, follow: true }
}

export const viewport = {
  themeColor: '#08080a',
  colorScheme: 'dark'
}

export default function RootLayout ({ children }) {
  return (
    <html lang="en" className={archivo.variable}>
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
