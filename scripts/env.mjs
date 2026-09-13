// Reads .env.local the way Next does for the app.
//
// A plain node script gets none of that, so every admin script here either
// loaded the file itself or demanded the value on the command line, where it
// ends up in the shell history of whoever ran it. One of them did one and one
// did the other, which is how "Set DATABASE_URL first" turns up while the
// string is sitting in .env.local being read by the dev server.
//
// Existing environment always wins, so a value passed for a single run still
// overrides the file.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

export function loadEnv (files = ['.env.local', '.env']) {
  for (const name of files) {
    const file = path.join(ROOT, name)
    if (!fs.existsSync(file)) continue
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#') || !t.includes('=')) continue
      const i = t.indexOf('=')
      const k = t.slice(0, i).trim()
      if (k && !process.env[k]) {
        process.env[k] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '')
      }
    }
  }
}
