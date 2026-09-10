import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

const dev = process.env.NODE_ENV !== 'production'

// Enforced, after a report-only pass rather than instead of one.
//
// It went out as Content-Security-Policy-Report-Only first and every public
// page plus every screen in the /dev harness was loaded with the console
// collecting violations. That pass earned its keep: it caught @vercel/analytics
// reaching for its own host, which reading the code had not shown and which
// would have silently stopped analytics the moment this was enforced. Nothing
// else violated it, so it is enforced now.
//
// To take it back to report-only, put -Report-Only back on the header key
// below. That is the whole switch, in either direction.
//
// Why each line is the way it is:
const csp = [
  "default-src 'self'",

  // Next puts its hydration bootstrap in inline <script> tags, so a policy
  // without 'unsafe-inline' blocks the app from ever starting. Removing it
  // needs per-request nonces, which needs middleware; that is a change worth
  // making on its own, not smuggled into a header commit. Dev additionally
  // compiles with eval, which production never does.
  // va.vercel-scripts.com is where @vercel/analytics loads its collector from.
  // On Vercel the script is proxied same-origin as /_vercel/insights/script.js
  // and 'self' would have covered it, which is exactly why this was missed by
  // reading the code: only running the app with the policy on showed the
  // library reaching for its own host as well. Named here so analytics does
  // not silently stop reporting the day that path is the one taken.
  `script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com${dev ? " 'unsafe-eval'" : ''}`,

  // styled-jsx and every style={{...}} prop in the tree are inline styles.
  "style-src 'self' 'unsafe-inline'",

  // Covers cannot be an allowlist. A review carries whatever cover URL it was
  // rated with, people paste their own image URLs when storage is not
  // configured, and html-to-image builds its canvas out of data: and blob:
  // URLs. Restricting this to known CDNs would break user content, so it is
  // https: and the openness is on purpose. Images cannot execute; this is the
  // one directive where being permissive costs little.
  "img-src 'self' data: blob: https:",

  // next/font/google downloads the faces at build time and serves them from
  // this origin, so no font host is needed here.
  "font-src 'self' data:",

  // Any https host, and that is not laziness.
  //
  // The catalogue APIs really are server-side and do not need to be here. What
  // does is the exporter: html-to-image inlines every picture on a slide by
  // fetching it, so a fetch has to be allowed anywhere a picture can come from.
  // Pictures come from a cover somebody pasted, an artist cut-out they linked,
  // or an upload on the storage host — arbitrary https by design, because the
  // rater chooses them. Locked to 'self' this returned "Could not render the
  // slides" for any slide carrying a picture this origin does not serve.
  //
  // The narrower options were tried on paper and both are wrong: an allowlist
  // cannot enumerate hosts the rater has not picked yet, and routing them
  // through /api/art would need that proxy to fetch arbitrary URLs, which is
  // the open proxy its host allowlist exists to prevent.
  //
  // What this gives up is a channel for exfiltrating what is already on the
  // page, and that costs an attacker script to use. script-src still refuses
  // one from anywhere but this origin, and the tree has no innerHTML sink and
  // no eval to plant one with. data: and blob: are listed because the exporter
  // re-reads its own output through them, and neither can reach a network.
  "connect-src 'self' https: data: blob:",

  // Nothing here is meant to be embedded, and clickjacking a rating form into
  // an invisible iframe is the attack this closes. X-Frame-Options below says
  // the same thing for browsers that predate this directive.
  "frame-ancestors 'none'",

  // No plugins, and no way for injected markup to retarget every relative URL
  // on the page by writing its own <base>.
  "object-src 'none'",
  "base-uri 'self'",

  // Sign-in and every mutation post back here. A form that posts anywhere else
  // is exfiltration, not a feature.
  "form-action 'self'",

  'upgrade-insecure-requests'
].join('; ')

const securityHeaders = [
  // All enforced. The six below CSP cannot break a working page: each one
  // forbids something this app does not do.
  { key: 'Content-Security-Policy', value: csp },

  // Two years, subdomains included, so a stripped-to-http link is refused by
  // the browser before a request leaves the machine. Vercel serves https and
  // redirects http, but a redirect still puts one cleartext request on the
  // wire; this removes that one.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },

  // The artwork proxy returns bytes from another host. Without this a browser
  // is free to sniff past the declared type and decide a response is markup.
  { key: 'X-Content-Type-Options', value: 'nosniff' },

  { key: 'X-Frame-Options', value: 'DENY' },

  // Full URL to this origin, bare origin to anyone else, so a profile handle
  // or album id in the path is not handed to an image CDN in a Referer.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

  // None of these are features this app has, so all of them are refused. It
  // costs nothing today and means injected code cannot reach for a camera.
  {
    key: 'Permissions-Policy',
    value: 'accelerometer=(), autoplay=(), camera=(), display-capture=(), encrypted-media=(), fullscreen=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), usb=(), xr-spatial-tracking=()'
  },

  // Cross-origin windows opened from this one get no handle back to it.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' }
]

/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,

  // Every response, pages and API alike. None of these headers carry a body or
  // a cache directive, so nothing a route sets for itself is disturbed.
  async headers () {
    return [{ source: '/:path*', headers: securityHeaders }]
  },

  // There is a stray lockfile in the home directory, and without this Next
  // picks that as the workspace root and traces the wrong tree on deploy.
  outputFileTracingRoot: here,

  // `next build` and `next dev` share a build directory, so running a build
  // while the dev server is up replaces the chunks it is serving and every
  // page starts throwing MODULE_NOT_FOUND until it is restarted. Setting
  // BUILD_DIR sends a build somewhere else. Vercel sets nothing and gets the
  // default, which is what it expects.
  distDir: process.env.BUILD_DIR || '.next'
}
