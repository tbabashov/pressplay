import { proxyImg } from '../api.js'

async function toDataURL (url) {
  const blob = await (await fetch(proxyImg(url))).blob()
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(blob)
  })
}

// Every cover is inlined as a data URL before the frames render, so the PNG
// capture contains no external resources and can't race the network into
// pasting one album's art onto another's row.
export function embedder () {
  const cache = new Map()
  return async url => {
    if (!url) return ''
    if (url.startsWith('data:')) return url
    if (!cache.has(url)) cache.set(url, await toDataURL(url).catch(() => ''))
    return cache.get(url)
  }
}
