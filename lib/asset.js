import fs from 'node:fs'
import path from 'node:path'

// Photography the user has to supply does not exist yet, and PRODUCT.md says
// an absence must be left as a described placeholder rather than filled with
// something invented. So the page asks whether the file is there: drop it in
// and it appears, with no code change and no broken image in the meantime.
export function hasAsset (publicPath) {
  try {
    return fs.existsSync(path.join(process.cwd(), 'public', publicPath.replace(/^\//, '')))
  } catch {
    return false
  }
}
