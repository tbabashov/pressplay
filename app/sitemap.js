import { listProfiles, listReviews } from '@/lib/db'
import { published } from '@/lib/social-queries'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://pressplayrankings.com'

// Every published review is a page a stranger could land on, which is the only
// way this gets found without someone posting a link. Built from the database
// rather than written down, so it cannot go stale.
export const revalidate = 3600

export default async function sitemap () {
  const fixed = ['', '/browse', '/tiers', '/legal/terms', '/legal/privacy', '/legal/cookies'].map(p => ({
    url: `${SITE}${p}`,
    lastModified: new Date(),
    changeFrequency: p === '' ? 'weekly' : 'monthly',
    priority: p === '' ? 1 : 0.5
  }))

  let people = []
  try {
    const profiles = await listProfiles()
    people = (await Promise.all(profiles.map(async p => {
      if (!p.handle) return []
      const live = published(await listReviews(p.email))
      if (!live.length) return []
      return [
        { url: `${SITE}/u/${p.handle}`, lastModified: new Date(p.updatedAt || Date.now()),
          changeFrequency: 'weekly', priority: 0.8 },
        ...live.map(r => ({
          url: `${SITE}/u/${p.handle}/${encodeURIComponent(r.albumId)}`,
          lastModified: new Date(r.updatedAt || Date.now()),
          changeFrequency: 'monthly',
          priority: 0.7
        }))
      ]
    }))).flat()
  } catch {
    // A sitemap that throws takes the route down with it; one that is short is
    // merely a smaller sitemap.
  }

  return [...fixed, ...people]
}
