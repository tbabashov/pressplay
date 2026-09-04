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
    reviews: [{ albumId: '1', year: '1999', scores: { a: 11 }, scaleModel: { max: 11 },
                album: { tracks: [{ id: 'a' }] } }]
  })
  const get = (list, k) => list.find(a => a.key === k)
  assert.equal(get(one, 'first-play').earned, true)
  assert.equal(get(one, 'perfect').earned, true, 'one top mark earns Perfect')
  assert.equal(get(one, 'majestic').have, 1, 'and counts once towards Majestic')
  assert.equal(get(one, 'majestic').earned, false, 'which needs twenty five')
  assert.equal(get(one, 'century').earned, false)

  // The badges used to name numbers, so they only described the house ladder.
  // Majestic asked for an eleven, and once the default became the ten point
  // scale no new account could ever earn it. Every scoring badge is now read
  // against the ladder its own review was rated on.
  const tenPoint = achievementsFor({
    reviews: [{ albumId: '2', scores: { a: 10, b: 8, c: 9, d: 9, e: 8 }, scaleModel: { max: 10 },
                album: { tracks: ['a', 'b', 'c', 'd', 'e'].map(id => ({ id })) } }]
  })
  assert.equal(get(tenPoint, 'perfect').earned, true, 'a ten is the top of a ten point ladder')
  assert.equal(get(tenPoint, 'flawless').earned, true, 'and eight is inside its top fifth')

  // On a hundred point ladder an eleven is a poor score, not a perfect one, and
  // "nine or more" would otherwise make Flawless automatic.
  const hundred = achievementsFor({
    reviews: [{ albumId: '3', scores: { a: 11, b: 9, c: 10, d: 9, e: 11 }, scaleModel: { max: 100 },
                album: { tracks: ['a', 'b', 'c', 'd', 'e'].map(id => ({ id })) } }]
  })
  assert.equal(get(hundred, 'perfect').earned, false, 'eleven out of a hundred is not the top')
  assert.equal(get(hundred, 'flawless').earned, false, 'nor is it the top fifth')
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

await test('a collaboration is rated on both artists discographies', async () => {
  // Scaring The Hoes is credited to JPEGMAFIA and Danny Brown, and the review
  // stored both. Everything downstream read the single artist column, so the
  // record belonged to JPEGMAFIA alone: Danny Brown's discography slide showed
  // it as an unrated question mark on a record he is on.
  const { creditsOf, creditsInclude, albumTitleKey } =
    await import(R + 'discography-match.js')

  const review = {
    albumName: 'Scaring The Hoes',
    artist: 'JPEGMAFIA',
    album: { artists: ['JPEGMAFIA', 'Danny Brown'] }
  }

  assert.deepEqual(creditsOf(review), ['JPEGMAFIA', 'Danny Brown'])
  assert.ok(creditsInclude(review, 'Danny Brown'), 'the second credit counts')
  assert.ok(creditsInclude(review, 'JPEGMAFIA'))
  assert.ok(creditsInclude(review, '  danny brown '), 'case and spacing do not matter')
  assert.ok(!creditsInclude(review, 'Madlib'))
  assert.ok(!creditsInclude(review, ''), 'no artist matches nothing')

  // A review with no snapshot still works off its single column.
  assert.deepEqual(creditsOf({ artist: 'Danny Brown' }), ['Danny Brown'])
  assert.ok(creditsInclude({ artist: 'Danny Brown' }, 'Danny Brown'))

  // Titles: one album typed two ways is one album.
  assert.equal(albumTitleKey('uknowhatimsayin\u00bf'), albumTitleKey('uknowhatimsayin'))
  assert.equal(albumTitleKey('Atrocity Exhibition'), albumTitleKey('atrocity  exhibition'))
  assert.equal(albumTitleKey('Old (Deluxe Edition)'), albumTitleKey('Old'))

  // But a genuinely different release stays different. A director's cut is not
  // the album, and merging them would hide one behind the other.
  assert.notEqual(albumTitleKey('SCARING THE HOES'), albumTitleKey("SCARING THE HOES: DIRECTOR'S CUT"))
  assert.notEqual(albumTitleKey('Hot Soup'), albumTitleKey('Hot Soup - Instrumentals'))

  // A title of nothing but punctuation keeps itself rather than collapsing to
  // an empty string that every other one would collide with.
  assert.equal(albumTitleKey('???'), '???')
  assert.notEqual(albumTitleKey('???'), albumTitleKey('!!!'))
})

await test('every review field the app saves has a column to land in', async () => {
  // criteriaModel, scaleModel and hiddenParts were written by the route, kept
  // by the file store, and silently dropped by Postgres, because the table had
  // nowhere to put them. It passed every local test: the file store keeps whole
  // objects and has no columns to forget. So this reads the SQL instead.
  const { readFileSync } = await import('node:fs')
  const src = readFileSync(new URL('../lib/db/postgres.js', import.meta.url), 'utf8')

  const insert = src.slice(src.indexOf('insert into reviews'))
  const columns = insert.slice(insert.indexOf('(') + 1, insert.indexOf(')'))
    .split(',').map(c => c.trim()).filter(Boolean)

  // The highest $n in the values clause has to be the number of columns, or the
  // insert is malformed or a column is silently taking a default.
  const valuesClause = insert.slice(insert.indexOf('values ('), insert.indexOf('on conflict'))
  const highest = Math.max(...[...valuesClause.matchAll(/\$(\d+)/g)].map(m => Number(m[1])))
  assert.equal(highest, columns.length,
    `${columns.length} columns but the values clause goes up to $${highest}`)

  // Everything the review shape reads back has to be a column too, or it is
  // being saved into nothing.
  const shape = src.slice(src.indexOf('const shape ='), src.indexOf('export async function getReview'))
  for (const col of ['criteria_model', 'scale_model', 'hidden_parts', 'selections', 'album']) {
    assert.ok(columns.includes(col), `${col} is missing from the insert`)
    assert.ok(shape.includes(col), `${col} is never read back`)
    assert.ok(insert.includes(`${col} = excluded.${col}`) || col === 'album',
      `${col} is inserted but never updated, so a second save would not change it`)
  }
})

await test('a chip keeps its gradient but not its edges', async () => {
  // The 10 and 11 run light, dark, light along a diagonal, so on a small chip
  // both light ends land in opposite corners and read as an outline drawn
  // round it. The gradient is the point and stays; it just runs one way.
  const { chipColour, ratingColor } = await import(R + 'rating-colors.js')

  for (const v of [10, 11]) {
    const chip = chipColour(v).bg
    assert.ok(chip.startsWith('linear-gradient'), `${v} is still a gradient`)
    assert.ok(chip.includes('180deg'), `${v} shades top to bottom, not corner to corner`)
    // One direction only: three or more colour stops is what puts light back
    // at the far end and draws the edge.
    assert.equal((chip.match(/#[0-9a-f]{6}/gi) || []).length, 2, `${v} has two stops`)
    // The slides keep the diagonal they were signed off with.
    assert.ok(ratingColor(v).bg.includes('135deg'), `${v} is unchanged on a slide`)
  }

  // Everything below 10 was always one colour and still is.
  assert.ok(!chipColour(9).bg.includes('gradient'))
  assert.equal(chipColour(9).bg, ratingColor(9).bg)

  // A scale someone built has its own colours and never gets the house ones.
  const custom = { id: 'custom', max: 10, signature: false, tiers: [{ value: 10, name: 'Top', colour: '#123456' }] }
  assert.equal(chipColour(10, custom).bg, '#123456')
})

await test('suggestions never repeat what you have already rated', async () => {
  // The catalogue half of this needs the network, so what is checked here is
  // the half that decides: an empty library falls back, a rated album never
  // comes back as a suggestion, and the seeding compares scores as a fraction
  // of their own ladder rather than as raw numbers.
  const { suggestionsFor } = await import(R + 'suggestions.js')

  const popular = [
    { name: 'Aquemini', artist: 'Outkast', cover: '/wall/a.jpg' },
    { name: 'Illmatic', artist: 'Nas', cover: '/wall/b.jpg' },
    { name: 'Blue', artist: 'Joni Mitchell', cover: '/wall/c.jpg' }
  ]

  // Nothing rated: the fallback, and it links by name because the wall has no
  // catalogue id to link to.
  const fresh = await suggestionsFor([], { limit: 3, seed: 1, popular })
  assert.equal(fresh.kind, 'popular')
  assert.equal(fresh.items.length, 3)
  assert.ok(fresh.items.every(i => i.query && !i.id), 'wall picks carry a search, not an id')

  // The same seed gives the same order, so the server and the browser agree.
  const again = await suggestionsFor([], { limit: 3, seed: 1, popular })
  assert.deepEqual(again.items.map(i => i.name), fresh.items.map(i => i.name))
  const other = await suggestionsFor([], { limit: 3, seed: 2, popular })
  assert.ok(Array.isArray(other.items))

  // A library with no scored albums cannot be built on, so it falls back too
  // rather than seeding from nothing.
  const unscored = await suggestionsFor(
    [{ artist: 'Outkast', albumName: 'Aquemini', final: null }],
    { limit: 3, seed: 1, popular })
  assert.equal(unscored.kind, 'popular')

  // An album already rated is never suggested back, whichever list it came
  // from. This is the one that would look broken to a user.
  const rated = [{ artist: 'Outkast', albumName: 'Aquemini', final: 9, scaleModel: { max: 11 } }]
  const out = await suggestionsFor(rated, { limit: 3, seed: 1, popular })
  assert.ok(!out.items.some(i => /aquemini/i.test(i.name)), 'Aquemini is not offered back')
})

await test('an unanswered criterion is not a zero', async () => {
  const { criterionValue } = await import(R + 'preferences.js')
  // Number('') and Number(null) are both 0, which published a criterion
  // nobody filled in as the worst score on the scale.
  assert.equal(criterionValue(''), null)
  assert.equal(criterionValue(null), null)
  assert.equal(criterionValue(undefined), null)
  assert.equal(criterionValue('abc'), null)
  // A real answer still counts, including a legitimate zero.
  assert.equal(criterionValue(0), 0)
  assert.equal(criterionValue('8.5'), 8.5)
})

await test('a criterion cannot push the final past the scale', async () => {
  const { ratingParts, finalRating, scaleMax } = await import(R + 'export/build.js')
  const review = {
    scores: { a: 10, b: 10 },
    criteria: { lyricism: 50, production: -3, delivery: '', albumExperience: 10, replayValue: 10 },
    scaleModel: { max: 10 }
  }
  const byKey = Object.fromEntries(ratingParts(review).map(p => [p.key, p.value]))
  assert.equal(byKey.lyricism, 10, '50 is clamped to the ceiling')
  assert.equal(byKey.production, 0, 'a negative is clamped to the floor')
  assert.equal(byKey.delivery, null, 'blank stays unanswered')
  assert.ok(finalRating(review) <= 10, 'the final stays on the scale')

  // A review saved before scales existed was given on the original eleven, so
  // it must not be told its elevens are tens.
  assert.equal(scaleMax({}), 11)
  assert.equal(scaleMax({ scaleModel: { max: 5 } }), 5)
  assert.equal(ratingParts({ criteria: { lyricism: 11 }, scores: {} })[1].value, 11)
})
