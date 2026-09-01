import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  // There is a stray lockfile in the home directory, and without this Next
  // picks that as the workspace root and traces the wrong tree on deploy.
  outputFileTracingRoot: here
}
