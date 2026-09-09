import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

const dev = process.env.NODE_ENV !== 'production'

// The policy this app intends to enforce, sent in report-only mode for now.
//
// Report-only means the browser checks every load against this and complains in
// the console, but blocks nothing. That is deliberate: a wrong CSP does not
// degrade a page, it white-screens it, and the only honest way to find out
// whether this one is right is to watch a real session against real data.
// Once the console is quiet, the header name below loses its -Report-Only.
//
// Why each line is the way it is:
const csp = [
  "default-src 'self'",

  // Next puts its hydration bootstrap in inline <script> tags, so a policy
  // without 'unsafe-inline' blocks the app from ever starting. Removing it
  // needs per-request nonces, which needs middleware; that is a change worth
  // making on its own, not smuggled into a header commit. Dev additionally
  // compiles with eval, which production never does.
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,

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

  // Apple, Discogs, Deezer and Lemon Squeezy are all called from the server,
  // never the browser, so they do not belong here. Vercel Analytics is proxied
  // same-origin but falls back to its own host on some deployments.
  "connect-src 'self' https://vitals.vercel-insights.com",

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
  // Enforced, all of them. Unlike CSP these cannot break a working page: each
  // one forbids something this app does not do.
  { key: 'Content-Security-Policy-Report-Only', value: csp },

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
