// The address this deployment actually answers on.
//
// Set NEXT_PUBLIC_SITE_URL once the custom domain has DNS and everything that
// needs an absolute URL follows it. Until then Vercel's own domain is the
// truthful answer: pressplayrankings.com resolves nowhere today, and a sitemap
// or an Open Graph image pointing at a domain that does not exist is worse
// than one pointing at an ugly URL, because the crawler and the link preview
// both simply fail rather than falling back to anything.
//
// VERCEL_PROJECT_PRODUCTION_URL is the stable production domain. VERCEL_URL is
// the per-deployment one and changes on every push, so using it would file a
// preview build's throwaway address in the sitemap.

const clean = u =>
  u ? `https://${String(u).replace(/^https?:\/\//, '').replace(/\/+$/, '')}` : null

export const SITE_URL =
  clean(process.env.NEXT_PUBLIC_SITE_URL) ||
  clean(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
  'https://pressplay-cyan.vercel.app'
