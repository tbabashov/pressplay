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

await test('a webhook signature is the whole of the billing security', async () => {
  // This route is the only thing that can raise an account's tier and it is
  // reachable by anyone who knows the URL, so a signature check that can be
  // fooled is a free Max subscription for the internet.
  const { createHmac } = await import('node:crypto')
  const { validSignature } = await import(R + 'billing.js')

  const secret = 'a-test-signing-secret'
  const body = JSON.stringify({ meta: { event_name: 'subscription_created' } })
  const good = createHmac('sha256', secret).update(body, 'utf8').digest('hex')

  assert.ok(validSignature(body, good, secret))
  assert.ok(validSignature(body, ` ${good.toUpperCase()} `, secret), 'case and spacing')

  assert.ok(!validSignature(body, good, 'the-wrong-secret'))
  assert.ok(!validSignature(body + ' ', good, secret), 'a changed body breaks it')
  assert.ok(!validSignature(body, good.slice(0, -2) + '00', secret))

  // Must return false, never throw: a throw here is a 500, and a 500 makes
  // Lemon Squeezy retry an event that is never going to be accepted.
  for (const bad of [null, undefined, '', 'not-hex', 'zz', good.slice(0, 10)]) {
    assert.equal(validSignature(body, bad, secret), false, String(bad))
  }
  assert.equal(validSignature(body, good, null), false, 'no secret configured')
})

await test('a subscription status becomes the right tier', async () => {
  process.env.LS_VARIANT_PLUS_MONTHLY = '111'
  process.env.LS_VARIANT_MAX_YEARLY = '222'
  const { subscriptionUpdate, emailFor, entitled } = await import(R + 'billing.js')

  const make = (variant, status) => ({
    meta: { custom_data: { email: 'Buyer@Example.com ' } },
    data: { id: 'sub_1', attributes: { variant_id: variant, status, user_email: 'till@example.com' } }
  })

  assert.equal(subscriptionUpdate(make('111', 'active')).tier, 'plus')
  assert.equal(subscriptionUpdate(make('222', 'active')).tier, 'max')
  assert.equal(subscriptionUpdate(make('222', 'on_trial')).tier, 'max')

  // Cancelled is "will not renew", not "has stopped": Lemon Squeezy sends
  // expired when the paid period actually runs out. Dropping the tier here
  // would take back time that was paid for.
  assert.equal(subscriptionUpdate(make('222', 'cancelled')).tier, 'max')
  assert.equal(subscriptionUpdate(make('222', 'past_due')).tier, 'max', 'retries still count')

  assert.equal(subscriptionUpdate(make('222', 'expired')).tier, 'free')
  assert.equal(subscriptionUpdate(make('222', 'unpaid')).tier, 'free')
  assert.equal(subscriptionUpdate(make('222', 'paused')).tier, 'free')

  // A product nobody configured is not this app's subscription. Guessing a
  // tier from an unknown variant is how someone gets Max for buying a sticker.
  assert.equal(subscriptionUpdate(make('999', 'active')), null)
  assert.equal(subscriptionUpdate(make(undefined, 'active')), null)
  assert.ok(!entitled('something_new'), 'an unknown status grants nothing')

  // The account email travels through checkout; the till email is only a
  // fallback, because the two are often not the same person's typing.
  assert.equal(emailFor(make('111', 'active')), 'buyer@example.com')
  assert.equal(
    emailFor({ data: { attributes: { user_email: 'Till@Example.com' } } }), 'till@example.com')
})

await test('the default ladder is the ten, and a stored eleven survives it', async () => {
  const { DEFAULT_SCALE, LEGACY_SCALE_ID, SCALE_PRESETS, normaliseScale } =
    await import(R + 'scales.js')

  assert.equal(DEFAULT_SCALE.id, 'ten', 'a new account starts on the ten')
  assert.equal(DEFAULT_SCALE.max, 10)

  // The eleven is not gone, it is just not the default any more. Removing it
  // would strand every account already scoring against it.
  const eleven = SCALE_PRESETS.find(sc => sc.id === LEGACY_SCALE_ID)
  assert.ok(eleven, 'the eleven is still a preset')
  assert.equal(eleven.max, 11)

  // What is stored is what is read: an account on the eleven keeps it without
  // anything having to know about the change.
  assert.equal(normaliseScale(eleven).id, 'eleven')
  assert.equal(normaliseScale(eleven).max, 11)

  // Nothing stored falls to the new default, which is exactly the case the
  // grandfather script exists to remove before the change ships.
  assert.equal(normaliseScale(null).id, 'ten')
  assert.equal(normaliseScale(undefined).id, 'ten')
})

await test('a typed superlative is bounded before it is stored', async () => {
  // Selections used to be written exactly as they arrived, which was fine while
  // every one was a track title picked off the page. One that is typed is not.
  const { normaliseSelections, TEXT_SUPERLATIVE_MAX, superlativeByKey } =
    await import(R + 'preferences.js')

  assert.equal(superlativeByKey.thoughts?.kind, 'text')

  const long = 'x'.repeat(TEXT_SUPERLATIVE_MAX + 500)
  assert.equal(normaliseSelections({ thoughts: long }).thoughts.length, TEXT_SUPERLATIVE_MAX)

  // A key nobody defined is not stored, so the review cannot be used as a bag
  // to keep arbitrary data in.
  assert.deepEqual(normaliseSelections({ notAThing: 'hello' }), {})
  assert.deepEqual(normaliseSelections('not an object'), {})
  assert.deepEqual(normaliseSelections(null), {})
  assert.deepEqual(normaliseSelections(['a']), {})

  // Blank stays blank rather than being stored as an empty answer.
  assert.deepEqual(normaliseSelections({ thoughts: '   ' }), {})

  // Line breaks the writer put in are kept; a wall of them is not, because a
  // slide has a fixed amount of room.
  assert.equal(normaliseSelections({ thoughts: 'one\n\ntwo' }).thoughts, 'one\n\ntwo')
  assert.equal(normaliseSelections({ thoughts: 'one\n\n\n\n\ntwo' }).thoughts, 'one\n\ntwo')

  // A chosen superlative is still capped, just far shorter.
  assert.equal(normaliseSelections({ bestSong: 'y'.repeat(500) }).bestSong.length, 200)
})

await test('best and worst song fill themselves in from the scores', async () => {
  // The rating screen showed the top scored track in the empty option, so it
  // read as decided, but the stored value stayed empty and every block that
  // draws a superlative checks for a value first. The best song block was
  // therefore missing from the slides of anyone who left it on automatic.
  const { autoBestSong, autoWorstSong, resolveSelections } = await import(R + 'auto-picks.js')
  const { NA } = await import(R + 'rating-scale.js')

  const tracks = [
    { id: 'a', title: 'Opener' },
    { id: 'b', title: 'The Peak' },
    { id: 'c', title: 'The Dud' },
    { id: 'd', title: 'Skit' }
  ]
  const scores = { a: 7, b: 10, c: 3, d: NA }

  assert.equal(autoBestSong(scores, tracks), 'The Peak')
  assert.equal(autoWorstSong(scores, tracks), 'The Dud')

  // N/A is stored as a string, so a skit is never the worst song: it is not a
  // song. This is the case that made the typeof check worth having.
  assert.notEqual(autoWorstSong(scores, tracks), 'Skit')

  // An explicit pick always beats the automatic one.
  const chosen = resolveSelections({ bestSong: 'Opener' }, scores, tracks)
  assert.equal(chosen.bestSong, 'Opener')
  assert.equal(chosen.worstSong, 'The Dud')

  // Filled in when nothing was picked, which is the bug being fixed.
  const auto = resolveSelections({}, scores, tracks)
  assert.equal(auto.bestSong, 'The Peak')
  assert.equal(auto.worstSong, 'The Dud')

  // One scored track is its own best and its own worst, and every track on the
  // same number has no worst. Naming one would invent an opinion.
  const single = resolveSelections({}, { a: 9 }, tracks)
  assert.equal(single.bestSong, 'Opener')
  assert.equal(single.worstSong, undefined)
  const flat = resolveSelections({}, { a: 8, b: 8, c: 8 }, tracks)
  assert.equal(flat.worstSong, undefined, 'a flat record has no worst')

  // Nothing scored at all leaves both alone rather than guessing.
  assert.deepEqual(resolveSelections({}, {}, tracks), {})
  assert.deepEqual(resolveSelections({}, { a: 5 }, []), {})

  // A track is `name` in the saved album and `title` once the rating screen
  // has shaped it, and both reach here: the export builds from the raw
  // snapshot. Reading only `title` is why this worked on screen and returned
  // nothing on the slides, which is the whole bug being fixed.
  const raw = [
    { id: 'a', name: 'Opener' },
    { id: 'b', name: 'The Peak' },
    { id: 'c', name: 'The Dud' }
  ]
  assert.equal(autoBestSong(scores, raw), 'The Peak', 'the saved album shape works too')
  assert.equal(autoWorstSong(scores, raw), 'The Dud')
})

await test('an edited album survives a save and a reload', async () => {
  // Corrections were being written to the database and then discarded on the
  // next page load, because the rating screen read the catalogue first and
  // only fell back to the saved snapshot. This is that whole round trip.
  const { toSnapshot, fromSnapshot, preferSaved } = await import(R + 'album-shape.js')

  const catalogue = {
    id: '1', name: 'Bandana', artist: 'Freddie Gibbs',
    artists: ['Freddie Gibbs', 'Madlib'], artistId: '99', label: 'Keep Cool',
    cover: 'cover.jpg', year: '2019', genre: 'Rap', runtime: 2000,
    tracks: [
      { id: 't1', n: 1, title: 'Freestyle Shit', duration: 100, preview: true, features: [] },
      { id: 't2', n: 2, title: 'Half Manne Half Cocaine', duration: 200, preview: true, features: [] }
    ]
  }

  // What a rater does: fix a title, add a feature, rename the album.
  const edited = {
    ...catalogue,
    name: 'Bandana (Deluxe)',
    tracks: [
      { ...catalogue.tracks[0], title: 'Freestyle Shit', features: ['Black Thought'] },
      { ...catalogue.tracks[1], title: 'Half Manne, Half Cocaine' }
    ]
  }

  // Saved, then read back the way the page reads it.
  const reloaded = preferSaved(fromSnapshot(toSnapshot(edited)), catalogue)

  assert.equal(reloaded.name, 'Bandana (Deluxe)', 'the renamed album survives')
  assert.deepEqual(reloaded.tracks[0].features, ['Black Thought'], 'the added feature survives')
  assert.equal(reloaded.tracks[1].title, 'Half Manne, Half Cocaine', 'the fixed title survives')

  // Both main credits survive. Keeping only the first is why a record by two
  // people came back credited to one.
  assert.deepEqual(reloaded.artists, ['Freddie Gibbs', 'Madlib'])

  // The catalogue still supplies what a snapshot cannot carry.
  assert.equal(reloaded.tracks[0].preview, true, 'previews come back')
  assert.equal(reloaded.artistId, '99')

  // Editing the artist wins over the stored list rather than being ignored.
  const renamed = toSnapshot({ ...edited, artist: 'Freddie Gibbs & Madlib' })
  assert.equal(renamed.artists[0], 'Freddie Gibbs & Madlib')
  assert.ok(renamed.artists.includes('Madlib'))

  // An import has no catalogue entry at all and must still open.
  const imported = preferSaved(fromSnapshot(toSnapshot(edited)), null)
  assert.equal(imported.name, 'Bandana (Deluxe)')

  // A first rating has no snapshot yet, so the catalogue stands alone.
  assert.equal(preferSaved(null, catalogue).name, 'Bandana')
})
