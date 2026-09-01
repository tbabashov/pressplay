// What a rater has decided their instrument is: which criteria they score an
// album on, and which superlatives they hand out. PRODUCT.md is explicit that
// the five named criteria are the owner's own and are defaults, not rules, and
// that only the song average is fixed because it is derived rather than typed.
//
// Keys are permanent once used, because they are what a stored review's scores
// are filed under. Labels are free to change; renaming Lyricism to Bars must
// not orphan every review that already has a lyricism score.

export const DEFAULT_CRITERIA = [
  { key: 'lyricism', label: 'Lyricism' },
  { key: 'production', label: 'Production' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'albumExperience', label: 'Album Experience' },
  { key: 'replayValue', label: 'Replay Value' }
]

export const CRITERIA_MAX = 8
export const LABEL_MAX = 26

export const CRITERIA_PRESETS = [
  { id: 'pressplay', name: 'Press Play', note: 'The five this site was built on.', criteria: DEFAULT_CRITERIA },
  { id: 'lean', name: 'Lean', note: 'Two judgements and the song average.',
    criteria: [{ key: 'production', label: 'Production' }, { key: 'replayValue', label: 'Replay Value' }] },
  { id: 'words', name: 'Words first', note: 'For records you listen to for what is said.',
    criteria: [
      { key: 'lyricism', label: 'Lyricism' },
      { key: 'storytelling', label: 'Storytelling' },
      { key: 'wordplay', label: 'Wordplay' },
      { key: 'delivery', label: 'Delivery' }
    ] },
  { id: 'sound', name: 'Sound first', note: 'For records you listen to for how they are built.',
    criteria: [
      { key: 'production', label: 'Production' },
      { key: 'mixing', label: 'Mix and master' },
      { key: 'soundDesign', label: 'Sound design' },
      { key: 'albumExperience', label: 'Sequencing' }
    ] },
  { id: 'live', name: 'Performance', note: 'For live records and one-take sessions.',
    criteria: [
      { key: 'delivery', label: 'Performance' },
      { key: 'production', label: 'Sound' },
      { key: 'albumExperience', label: 'Setlist' },
      { key: 'atmosphere', label: 'Atmosphere' }
    ] }
]

// Every superlative the product knows how to award. A rater turns on the ones
// they believe in; the rating screen shows those and nothing else.
export const SUPERLATIVES = [
  { key: 'bestSong', label: 'Best song', kind: 'track' },
  { key: 'worstSong', label: 'Worst song', kind: 'track' },
  { key: 'nowPlaying', label: 'Now playing', kind: 'trackId', note: 'The song that plays over the exported video.' },
  { key: 'mostUnderrated', label: 'Most underrated', kind: 'track' },
  { key: 'mostOverrated', label: 'Most overrated', kind: 'track' },
  { key: 'bestFeature', label: 'Best feature', kind: 'feature' },
  { key: 'bestOpener', label: 'Best opener', kind: 'track' },
  { key: 'bestCloser', label: 'Best closer', kind: 'track' },
  { key: 'bestBeat', label: 'Best beat', kind: 'track' },
  { key: 'bestVerse', label: 'Best verse', kind: 'track' },
  { key: 'bestHook', label: 'Best hook', kind: 'track' },
  { key: 'grower', label: 'Biggest grower', kind: 'track' },
  { key: 'mostSkipped', label: 'Most skipped', kind: 'track' },
  { key: 'guiltyPleasure', label: 'Guilty pleasure', kind: 'track' }
]

export const DEFAULT_SUPERLATIVES = ['bestSong', 'worstSong', 'nowPlaying']
export const SUPERLATIVE_MAX = 8

const KEY_OK = /^[a-zA-Z][a-zA-Z0-9]*$/
export const keyFromLabel = label => {
  const parts = String(label).toLowerCase().normalize('NFKD')
    .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').trim().split(/ +/)
  if (!parts[0]) return ''
  return parts[0] + parts.slice(1).map(w => w[0].toUpperCase() + w.slice(1)).join('')
}

export const clampLabel = l => String(l ?? '').replace(/\s+/g, ' ').trim().slice(0, LABEL_MAX)

// Anything stored can have been written by an older version or by hand, so it
// is validated on the way out rather than trusted.
export function normaliseCriteria (list) {
  if (!Array.isArray(list)) return DEFAULT_CRITERIA
  const seen = new Set()
  const out = []
  for (const c of list) {
    const key = String(c?.key ?? '')
    const label = clampLabel(c?.label)
    if (!KEY_OK.test(key) || !label || seen.has(key)) continue
    seen.add(key)
    out.push({ key, label })
    if (out.length >= CRITERIA_MAX) break
  }
  // An album's score is the mean of the criteria plus the song average, so an
  // empty list would leave the song average as the whole verdict. That is a
  // legitimate way to rate, and it is the only case where the list may be empty.
  return out
}

export function normaliseSuperlatives (list) {
  if (!Array.isArray(list)) return DEFAULT_SUPERLATIVES
  const known = new Set(SUPERLATIVES.map(s => s.key))
  const out = []
  for (const k of list) {
    if (known.has(k) && !out.includes(k)) out.push(k)
    if (out.length >= SUPERLATIVE_MAX) break
  }
  return out
}

export const DEFAULT_PREFERENCES = {
  criteria: DEFAULT_CRITERIA,
  superlatives: DEFAULT_SUPERLATIVES
}

export const normalisePreferences = p => ({
  criteria: normaliseCriteria(p?.criteria),
  superlatives: normaliseSuperlatives(p?.superlatives)
})

export const superlativeByKey = Object.fromEntries(SUPERLATIVES.map(s => [s.key, s]))
