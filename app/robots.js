const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://pressplayrankings.com'

// The app itself is behind a sign-in and has nothing a search engine can read,
// so it is not worth crawling; the public pages are the whole point. Blocking
// /app also keeps a crawler from spending its budget on redirects to /join.
export default function robots () {
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      disallow: ['/app/', '/api/', '/join', '/render/', '/dev/']
    }],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE
  }
}
