import assert from 'node:assert/strict'
import { test } from './harness.mjs'

const R = '../lib/'

await test('creditsFrom takes the credit out of a title', async () => {
  const { creditsFrom } = await import(R + 'credits.js')
  assert.deepEqual(creditsFrom('Song (feat. A Guest)'), { title: 'Song', features: ['A Guest'] })
  assert.deepEqual(creditsFrom('Song ft. A, B'), { title: 'Song', features: ['A', 'B'] })
  // A comma inside a name is not a separator.
  assert.deepEqual(creditsFrom('Song (feat. Tyler, The Creator)').features, ['Tyler, The Creator'])
  // Bare "with" is not a credit, or MAKE OUT WITH MY CHOPPA loses its title.
  assert.equal(creditsFrom('MAKE OUT WITH MY CHOPPA').title, 'MAKE OUT WITH MY CHOPPA')
})

await test('albumKey folds an edition into the record it is an edition of', async () => {
  const { albumKey } = await import(R + 'preferences.js')
  assert.equal(albumKey('Tyler, The Creator', 'IGOR'), albumKey('tyler, the creator', 'IGOR (Deluxe)'))
  assert.notEqual(albumKey('A', 'One'), albumKey('B', 'One'))
})

await test('preferences never lose a key a caller did not send', async () => {
  const { normalisePreferences } = await import(R + 'preferences.js')
  const p = normalisePreferences({ hiddenAlbums: ['a::b'], seenAchievements: ['x'], looks: [] })
  assert.deepEqual(p.hiddenAlbums, ['a::b'])
  assert.deepEqual(p.seenAchievements, ['x'])
  assert.ok(Array.isArray(p.criteria) && p.criteria.length)
})

await test('tiers: the free tier is real and max is unlimited', async () => {
  const { limitsFor, canUseStyle, accountTier } = await import(R + 'tiers.js')
  assert.equal(limitsFor('free').generationsPerDay, 2)
  assert.equal(limitsFor('max').generationsPerDay, Infinity)
  assert.equal(limitsFor('nonsense').generationsPerDay, 2, 'an unknown tier reads as free')
  assert.equal(canUseStyle('free', 'aurora'), false)
  assert.equal(canUseStyle('plus', 'aurora'), true)
  assert.equal(canUseStyle('free', 'paper'), true)
  assert.equal(canUseStyle('max', 'signature'), true)
  assert.equal(accountTier({ user: { role: 'owner' } }, null), 'max')
})

await test('the yearly saving is computed, not typed', async () => {
  const { yearlySaving, TIER_DETAIL } = await import(R + 'tiers.js')
  const y = yearlySaving('plus')
  const expected = Math.round((1 - TIER_DETAIL.plus.yearly / (TIER_DETAIL.plus.monthly * 12)) * 100)
  assert.equal(y.percent, expected)
  assert.equal(yearlySaving('free'), null)
})

await test('achievements count off the library and never exceed their target', async () => {
  const { achievementsFor } = await import(R + 'achievements.js')
  const list = achievementsFor({ reviews: [], commentsWritten: 0, upvotes: 0, followers: 0 })
  assert.ok(list.length > 10)
  assert.ok(list.every(a => a.have <= a.need), 'progress is clamped to the target')
  assert.ok(list.every(a => !a.earned), 'an empty library has earned nothing')

  const one = achievementsFor({
    reviews: [{ albumId: '1', year: '1999', scores: { a: 11 }, album: { tracks: [{ id: 'a' }] } }]
  })
  assert.equal(one.find(a => a.key === 'first-play').earned, true)
  assert.equal(one.find(a => a.key === 'majestic').earned, true)
  assert.equal(one.find(a => a.key === 'century').earned, false)
})

await test('a score placeholder is a dash, not a comma', async () => {
  // A blanket punctuation sweep once turned every one of these into ", ".
  // The em dash here is a glyph standing in for a number nobody has entered
  // yet, not punctuation in a sentence, which is why it survives the rule
  // against em dashes in prose. N/A keeps a shorter en dash so an unscorable
  // track still reads differently from an unscored one.
  const { fmtScore } = await import(R + 'rating-scale.js')
  const { scoreText, NA } = await import(R + 'rating-colors.js')
  const { fmtScore: fmtScale } = await import(R + 'scales.js')
  const { fmtTime } = await import(R + 'music.js')

  for (const [what, got] of [
    ['fmtScore', fmtScore(null)],
    ['scales fmtScore', fmtScale(null)],
    ['scoreText', scoreText(null)],
    ['fmtTime', fmtTime(0)]
  ]) {
    assert.equal(got, '\u2014', `${what} should be an em dash`)
    assert.ok(!got.includes(','), `${what} must never be a comma`)
  }

  assert.equal(fmtScore(9), '9.0')
  // N/A is an en dash, unscored is an em dash. They must not collapse.
  assert.notEqual(scoreText(NA), scoreText(null))
})

await test('paletteFromColor takes the hex the pickers actually pass', async () => {
  const { paletteFromColor } = await import(R + 'rating-colors.js')
  const a = paletteFromColor('#d1495b')
  const b = paletteFromColor('#2563eb')
  assert.ok(a && b)
  assert.notEqual(a.accent, b.accent, 'two swatches must not produce one colour')
  assert.equal(paletteFromColor('not a colour'), null)
})

await test('nothing public carries an email address', async () => {
  const { publicProfile } = await import(R + 'profile.js')
  const out = publicProfile({ email: 'someone@example.com', handle: 'h', name: 'N' })
  assert.equal(JSON.stringify(out).includes('@'), false)
})

await test('taken off the slides is scoped to the record you are looking at', async () => {
  // A Drake export was listing "bandana beats" and "pinata beats" under
  // things taken off its slides, because hidden albums are one list for the
  // whole account and the panel never narrowed it to this artist.
  const { albumKey, hiddenForArtist } = await import(R + 'preferences.js')

  const hidden = [
    albumKey('Freddie Gibbs & Madlib', 'Bandana Beats'),
    albumKey('Freddie Gibbs & Madlib', 'Pinata Beats'),
    albumKey('Drake', 'For All The Dogs Scary Hours Edition')
  ]

  const onDrake = hiddenForArtist(hidden, ['Drake'])
  assert.equal(onDrake.length, 1, 'only Drake keys belong on a Drake export')
  assert.ok(onDrake[0].startsWith('drake::'))

  const onGibbs = hiddenForArtist(hidden, ['Freddie Gibbs & Madlib'])
  assert.equal(onGibbs.length, 2)

  // Case and stray spacing must not split one artist into two.
  assert.deepEqual(hiddenForArtist(hidden, ['  dRaKe ']), onDrake)

  // No artist means nothing to scope to, which must not mean everything.
  assert.deepEqual(hiddenForArtist(hidden, []), [])
  assert.deepEqual(hiddenForArtist(hidden, [undefined]), [])
})

await test('a password verifies, and changing it retires the old one', async () => {
  // The change-password route stands entirely on these two: it verifies the
  // current password against the stored hash, refuses a new one that verifies
  // against that same hash, and stores a fresh hash. If verify ever returned
  // true for the wrong string the route would hand the account over.
  const { hashPassword, verifyPassword, passwordError } =
    await import(R + 'password.js')
  const { PASSWORD_MAX } = await import(R + 'password-rules.js')

  const stored = await hashPassword('correct horse battery')
  assert.ok(await verifyPassword('correct horse battery', stored))
  assert.ok(!(await verifyPassword('Correct horse battery', stored)), 'case matters')
  assert.ok(!(await verifyPassword('', stored)))
  assert.ok(!(await verifyPassword('correct horse battery ', stored)), 'no trimming')

  // Same password, different salt: two hashes of one string never match as
  // strings, so nothing may compare them that way.
  const again = await hashPassword('correct horse battery')
  assert.notEqual(again, stored)
  assert.ok(await verifyPassword('correct horse battery', again))

  // Never throws on rubbish; an account with no password just fails to verify.
  for (const bad of [null, undefined, '', 'notahash', 'scrypt:x', 'bcrypt:1:2:3']) {
    assert.equal(await verifyPassword('anything', bad), false, String(bad))
  }

  const rotated = await hashPassword('a whole new thing')
  assert.ok(!(await verifyPassword('correct horse battery', rotated)), 'old one is retired')

  assert.ok(passwordError('short'), 'too short is refused')
  assert.ok(passwordError('x'.repeat(PASSWORD_MAX + 1)), 'too long is refused')
  assert.equal(passwordError('long enough to pass'), null)
})

await test('a hand built scale survives the trip through normaliseScale', async () => {
  // The builder can now change the top of the ladder and add or drop steps.
  // Everything it produces goes back out through normaliseScale, which is
  // allowed to reject a broken scale entirely and fall back to the default,
  // so an edit the builder permits but the normaliser refuses would look like
  // the save silently doing nothing.
  const { normaliseScale, DEFAULT_SCALE, SCALE_MAX_CEILING } = await import(R + 'scales.js')

  // A seven point ladder with only three named steps, which is the shape the
  // preset list could never make.
  const mine = {
    id: 'custom', name: 'My seven', max: 7, na: true, signature: false,
    tiers: [
      { value: 7, name: 'Untouchable', colour: '#8b5cf6' },
      { value: 4, name: 'Fine', colour: null },
      { value: 0, name: 'No', colour: '#d1495b' }
    ]
  }
  const out = normaliseScale(mine)
  assert.equal(out.max, 7)
  assert.equal(out.name, 'My seven')
  assert.equal(out.tiers.length, 3, 'steps are kept, not filled back in')
  assert.deepEqual(out.tiers.map(t => t.value), [7, 4, 0], 'and stay in order')
  assert.equal(out.tiers[0].name, 'Untouchable')
  assert.equal(out.tiers[0].colour, '#8b5cf6')

  // The extremes the number field allows.
  assert.equal(normaliseScale({ ...mine, max: 1, tiers: [
    { value: 1, name: 'Yes' }, { value: 0, name: 'No' }] }).max, 1)
  assert.equal(normaliseScale({ ...mine, max: SCALE_MAX_CEILING, tiers: [
    { value: SCALE_MAX_CEILING, name: 'Top' }, { value: 0, name: 'Bottom' }] }).max,
    SCALE_MAX_CEILING)

  // A step above the top is dropped rather than taken as the new top, which is
  // why lowering the max in the builder has to prune before it saves.
  const pruned = normaliseScale({ ...mine, max: 5 })
  assert.ok(!pruned.tiers.some(t => t.value > 5), 'nothing above the top survives')

  // Out of range tops fall back rather than clamping, so the builder must
  // never send one: this is the case that would wipe someone's ladder.
  assert.equal(normaliseScale({ ...mine, max: 0 }), DEFAULT_SCALE)
  assert.equal(normaliseScale({ ...mine, max: SCALE_MAX_CEILING + 1 }), DEFAULT_SCALE)
})
