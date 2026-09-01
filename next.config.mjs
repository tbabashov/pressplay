import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,

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
