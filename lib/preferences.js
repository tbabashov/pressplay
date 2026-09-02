import { DEFAULT_SCALE, normaliseScale } from './scales.js'

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
  { key: 'guiltyPleasure', label: 'Guilty pleasure', kind: 'track' },
  { key: 'personalFavourite', label: 'Personal favourite', kind: 'track', note: 'Not the best one. Yours.' },
  { key: 'mostPopular', label: 'Most popular', kind: 'track' },
  { key: 'leastPopular', label: 'Least popular', kind: 'track' },
  { key: 'deepCut', label: 'Best deep cut', kind: 'track' },
  { key: 'bestSample', label: 'Best sample', kind: 'track' },
  { key: 'bestTransition', label: 'Best transition', kind: 'track' },
  { key: 'bestOutro', label: 'Best outro', kind: 'track' },
  { key: 'mostReplayed', label: 'Most replayed', kind: 'track' },
  { key: 'bestWriting', label: 'Best writing', kind: 'track' },
  { key: 'weakestLink', label: 'Weakest link', kind: 'track' },
  { key: 'bestFeatureVerse', label: 'Best guest verse', kind: 'track' },
  { key: 'skipEveryTime', label: 'Skip every time', kind: 'track' }
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

// Albums the catalogue offers but you never want on a slide. The catalogue
// hands back singles and one-off EPs typed as albums, and those entries only
// exist at export time, so there was nothing on the discography screen to
// delete. They are keyed by artist and title rather than by catalogue id: an
// id can change under us, and the title key already folds "(Deluxe)" into the
// edition you meant, so hiding one hides the reissue with it.
export const HIDDEN_MAX = 500

export const albumKey = (artist, name) =>
  `${String(artist ?? '').toLowerCase().trim()}::` +
  `${String(name ?? '').toLowerCase().trim().replace(/\s*[([].*$/, '')}`

export function normaliseHidden (list) {
  if (!Array.isArray(list)) return []
  const out = []
  for (const k of list) {
    const v = String(k ?? '').trim()
    if (v && v.includes('::') && !out.includes(v)) out.push(v)
    if (out.length >= HIDDEN_MAX) break
  }
  return out
}

// Which badges have already been announced. Achievements themselves are
// counted off the library rather than stored, so this is the only thing that
// needs remembering: without it there is no way to tell a badge earned just now
// from one earned last month, and every page load would announce all of them.
export const normaliseSeen = list =>
  (Array.isArray(list) ? [...new Set(list.map(v => String(v).slice(0, 60)))] : []).slice(0, 200)

// A saved look is the export settings under a name, so the same treatment can
// be put on the next record without setting it up again. Only the fields that
// describe how slides look are kept: nothing about which album, and nothing
// that belongs to one review.
export const LOOK_FIELDS = [
  'style', 'accent', 'theme', 'watermark', 'showHandle', 'handle',
  'background', 'backgroundImage', 'backgroundDim',
  'perPage', 'scale', 'discPerPage', 'autoDiscography', 'include',
  'align', 'textSize', 'featureDrop', 'safeZones', 'dome'
]
export const LOOK_NAME_MAX = 32

export function normaliseLooks (list, max = 20) {
  if (!Array.isArray(list)) return []
  const out = []
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue
    const name = String(raw.name ?? '').replace(/\s+/g, ' ').trim().slice(0, LOOK_NAME_MAX)
    if (!name) continue
    const settings = {}
    for (const k of LOOK_FIELDS) if (raw.settings?.[k] !== undefined) settings[k] = raw.settings[k]
    out.push({ id: String(raw.id || '').slice(0, 40) || `l${out.length}${Date.now().toString(36)}`, name, settings })
    if (out.length >= max) break
  }
  return out
}

export const DEFAULT_PREFERENCES = {
  criteria: DEFAULT_CRITERIA,
  superlatives: DEFAULT_SUPERLATIVES,
  scale: DEFAULT_SCALE,
  hiddenAlbums: [],
  seenAchievements: [],
  looks: []
}

export const normalisePreferences = p => ({
  criteria: normaliseCriteria(p?.criteria),
  superlatives: normaliseSuperlatives(p?.superlatives),
  scale: normaliseScale(p?.scale),
  hiddenAlbums: normaliseHidden(p?.hiddenAlbums),
  seenAchievements: normaliseSeen(p?.seenAchievements),
  looks: normaliseLooks(p?.looks)
})

export const superlativeByKey = Object.fromEntries(SUPERLATIVES.map(s => [s.key, s]))
