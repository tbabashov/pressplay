// Catalogues put guests in one of two places and are inconsistent about which:
// a contributors list that is often empty on a tracklist response, or inside
// the title itself. Deezer's short title strips "(feat. X)" but leaves
// "(with X)", so a song called "The Girl Is Mine (with Paul McCartney)" arrives
// with the credit in its name and no features at all.

// "with" only counts inside brackets. Unbracketed it is an ordinary word, and
// treating it as a credit turns MAKE OUT WITH MY CHOPPA into a song called
// MAKE OUT featuring MY CHOPPA.
const BRACKETED = /[(\[]\s*(?:feat|ft|featuring|w\/|with)\b\.?\s+([^)\]]+)[)\]]\s*$/i
const BARE = /\s+(?:feat|ft|featuring)\b\.?\s+(.+)$/i

// Splitting a credit into names is where "Tyler, The Creator" dies, because the
// separator is also inside the name. Known names with a comma are matched whole
// before anything is split on.
const COMMA_NAMES = [
  'Tyler, The Creator', 'Earth, Wind & Fire', 'Crosby, Stills & Nash',
  'Blood, Sweat & Tears', 'Emerson, Lake & Palmer', 'Tyler The Creator'
]

export function splitNames (text) {
  let rest = String(text || '')
  const found = []

  for (const name of COMMA_NAMES) {
    const at = rest.toLowerCase().indexOf(name.toLowerCase())
    if (at !== -1) {
      found.push(name)
      rest = rest.slice(0, at) + ' , ' + rest.slice(at + name.length)
    }
  }

  return [
    ...found,
    ...rest.split(/\s*(?:,|&|;|\band\b|\bx\b)\s*/i).map(s => s.trim()).filter(Boolean)
  ]
}

// The title with its credit removed, and whoever the credit named.
export function creditsFrom (title) {
  const t = String(title || '')
  const m = BRACKETED.exec(t) || BARE.exec(t)
  if (!m) return { title: t.trim(), features: [] }
  return {
    title: t.slice(0, m.index).trim().replace(/[\s([-]+$/, ''),
    features: splitNames(m[1])
  }
}
