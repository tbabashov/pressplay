import Hero from '@/components/Hero'
import Wall from '@/components/Wall'
import ReviewDemo from '@/components/ReviewDemo'
import Placeholder from '@/components/Placeholder'
import CoverBand from '@/components/CoverBand'
import Mark from '@/components/Mark'
import Slides from '@/components/Slides'
import { hasAsset } from '@/lib/asset'
import { SignIn, StartButton } from '@/components/AuthButtons'
import Nav from '@/components/Nav'
import wall from '@/lib/wall.json'
import slidesByAlbum from '@/lib/slides.json'
import { TIER_LIST } from '@/lib/tiers'
import CheckoutButton from '@/components/CheckoutButton'
import './landing.css'

// TODO: set this to the real account before launch. One line, used in two places.
const TIKTOK = { handle: '@the.press.play', url: 'https://www.tiktok.com/@the.press.play' }

// TODO: fill these in. Anything left null is simply not rendered.
const SOCIALS = [
  { id: 'tiktok', label: 'TikTok', handle: '@the.press.play', url: TIKTOK.url },
  { id: 'instagram', label: 'Instagram', handle: null, url: null },
  { id: 'github', label: 'GitHub', handle: 'tbabashov', url: 'https://github.com/tbabashov' }
]

const SocialIcon = ({ id, size = 18 }) => {
  const p = {
    // Redrawn on the 24 grid rather than sitting where it was pasted. The old
    // path spanned x 5.4 to 21 and y 2 to 21.5, so its centre of mass was down
    // and to the right of the circle it sits in and the note looked nudged.
    tiktok: 'M15.1 2.4h-2.9v12.9a2.36 2.36 0 1 1-2-2.33V10.1a5.55 5.55 0 1 0 4.9 5.5V9.05a7.25 7.25 0 0 0 4.15 1.32V7.5a4.33 4.33 0 0 1-4.15-4.33V2.4z',
    instagram: 'M12 2.2c3.2 0 3.6 0 4.9.07 1.2.06 1.8.25 2.2.42.6.22 1 .48 1.4.9.43.43.7.83.9 1.4.18.42.37 1.05.43 2.2.06 1.3.07 1.7.07 4.9s-.01 3.6-.07 4.9c-.06 1.2-.25 1.8-.42 2.2-.22.6-.48 1-.9 1.4-.43.43-.83.7-1.4.9-.42.18-1.05.37-2.2.43-1.3.06-1.7.07-4.9.07s-3.6-.01-4.9-.07c-1.2-.06-1.8-.25-2.2-.42-.6-.22-1-.48-1.4-.9-.43-.43-.7-.83-.9-1.4-.18-.42-.37-1.05-.43-2.2C2.2 15.6 2.2 15.2 2.2 12s.01-3.6.07-4.9c.06-1.2.25-1.8.42-2.2.22-.6.48-1 .9-1.4.43-.43.83-.7 1.4-.9.42-.18 1.05-.37 2.2-.43C8.4 2.2 8.8 2.2 12 2.2zm0 3.2a6.6 6.6 0 1 0 0 13.2 6.6 6.6 0 0 0 0-13.2zm0 10.9a4.3 4.3 0 1 1 0-8.6 4.3 4.3 0 0 1 0 8.6zm8.4-11.2a1.55 1.55 0 1 1-3.1 0 1.55 1.55 0 0 1 3.1 0z',
    github: 'M12 1.8a10.2 10.2 0 0 0-3.2 19.9c.5.1.7-.22.7-.5v-1.8c-2.85.6-3.45-1.2-3.45-1.2-.45-1.2-1.15-1.5-1.15-1.5-.95-.65.07-.63.07-.63 1.05.07 1.6 1.08 1.6 1.08.93 1.6 2.45 1.14 3.05.87.1-.68.36-1.14.66-1.4-2.28-.26-4.67-1.14-4.67-5.07 0-1.12.4-2.03 1.06-2.75-.11-.26-.46-1.3.1-2.71 0 0 .86-.28 2.83 1.05a9.7 9.7 0 0 1 5.16 0c1.97-1.33 2.83-1.05 2.83-1.05.56 1.41.21 2.45.1 2.71.66.72 1.06 1.63 1.06 2.75 0 3.94-2.4 4.8-4.68 5.06.37.32.7.94.7 1.9v2.8c0 .28.18.61.7.5A10.2 10.2 0 0 0 12 1.8z'
  }[id]
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={p} fill="currentColor" />
    </svg>
  )
}

const LABELS = [
  'Title card', 'Every song, scored', 'The rest of them', 'The criteria',
  'Where it lands', 'The discography', 'The rest of the discography'
]
const SLIDES = (slidesByAlbum['the-blueprint'] || []).map((src, i) => ({
  src, label: LABELS[i] || `Slide ${i + 1}`
}))

// Behind See it in the wild, every album rather than one: the claim is that
// these get posted a record at a time, so the wall should look like more than
// one record. Interleaved rather than concatenated so no album lands as a
// block, and fixed rather than shuffled per render, since the server and the
// client have to agree on the markup.
const WALL_SLIDES = (() => {
  const sets = Object.values(slidesByAlbum)
  const out = []
  for (let i = 0; i < Math.max(...sets.map(s => s.length)); i++) {
    for (const set of sets) if (set[i]) out.push(set[i])
  }
  return out
})()

// Real questions, in the order somebody weighing this up would think of them.
const FAQS = [
  ['Is it actually free?',
    'Yes, and without a card. A free account rates as many albums as it likes and ' +
    'gets two of them a day as slides, with three of the five styles and a small ' +
    'Press Play mark in the corner. Paid tiers raise the daily limit, drop the mark ' +
    'and unlock the scale and criteria editors. Nothing you have already rated is ' +
    'ever locked behind a tier.'],

  ['Do I have to score every song?',
    'No. The album average only counts the songs you scored, so you can rate the ' +
    'six that matter and leave the rest. Skits and interludes get a dash instead of ' +
    'a number and stay out of the average entirely, which is the point of having one.'],

  ['Where do the albums and previews come from?',
    'The catalogue is Deezer: real tracklists, artwork, running times and thirty ' +
    'second previews. It is not always right, so everything is editable. A title you ' +
    'fix or a feature you add is saved on your own copy of the record and stays ' +
    'fixed, whatever the catalogue does later.'],

  ['Can other people see what I rate?',
    'Only what you publish, one album at a time. Everything else is private to your ' +
    'account, including scores you are still arguing with yourself about. Publishing ' +
    'gives that one review a public page; you can unpublish it again.'],

  ['Do I have to use your scale?',
    'No. Ten is the default, and there is an eleven with a Majestic on top, five ' +
    'stars, and a hundred point for anyone who wants the room. On a paid tier you ' +
    'can build your own: set the top, name the rungs, colour them.'],

  ['What happens to old ratings if I change the scale?',
    'Nothing. Every review remembers the scale it was rated on, so a nine out of ten ' +
    'stays a nine out of ten even after you move to a hundred point. Changing the ' +
    'model changes what you rate next, not what you already said.'],

  ['What are the slides for?',
    'Posting. Every rating exports as a set of 1080 by 1920 images, sized for TikTok ' +
    'and Stories and laid out so nothing important sits under a caption or a button ' +
    'rail. Title card, every song scored, your criteria, where the album lands ' +
    'against everything else you have rated, the discography, and whatever you wrote ' +
    'about it.'],

  ['Can I take my ratings out, or delete them?',
    'Yes, both, from the bottom of your profile. You can delete your ratings and keep ' +
    'the account, or delete the account and everything attached to it. It is not a ' +
    'support request and there is no retention period.']
]

const STEPS = [
  ['Find it', 'Search once and get the real tracklist, artwork and running times.'],
  ['Play it', 'Thirty second previews sit next to every track.'],
  ['Score it', 'Rate each song on the scale you built. Skits get marked N/A and stay out of the average.'],
  ['Publish it', 'Weigh your criteria, get your number, export the slides.']
]



export default async function Landing () {
  return (
    <>
      <Nav><SignIn /></Nav>

      <Hero albums={wall}>
        <StartButton />
        <a className="btn-ghost" href="#how">See how it works</a>
      </Hero>

      <main>
        <section className="band" id="how">
          <div className="shell">
            <h2 className="display h2 rv">Four steps, then it is a post.</h2>
            <ol className="steps">
              {STEPS.map(([title, body]) => (
                <li key={title}>
                  <span className="step-rule" aria-hidden="true" />
                  <h3>{title}</h3>
                  <p>{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="band-photo">
          <CoverBand
            albums={wall}
            heading="Whatever you put on, scored the same way."
            sub="Rap, jazz, classical, country, dub, techno. One instrument, applied honestly, for as many records as you care to sit with. The number that comes out is yours to defend."
          />
        </section>

        <section className="band band-alt" id="reviews">
          <div className="shell">
            <h2 className="display h2 rv">A score is the start of the argument.</h2>
            <p className="lede measure rv">
              Publish a review and it gets a page of its own, open to everyone. People vote on it,
              pull it apart, and you answer back. Below is a worked example of one, written for
              this page rather than by a real member.
            </p>
            <ReviewDemo />
          </div>
        </section>

        <section className="band rateband" id="rating">
          {/* The screen is the ground the section stands on, not a picture
              dropped into the middle of it: full height, bleeding off the
              right edge the way it would if you were looking over someone's
              shoulder, with the copy held on the readable side. */}
          <div className="rateband-bg" aria-hidden="true">
            <img
              src="/photos/rating-late-registration.jpg"
              alt="" width="1800" height="1473" loading="lazy"
            />
          </div>

          <div className="shell rateband-copy">
            <h2 className="display h2 rv">Score it song by song.</h2>
            <p className="lede measure rv">
              The whole record, one row at a time, with a preview of every track so you are
              rating what you actually heard. Type a number on whatever scale you set, or a dash for the skits
              that were never trying to be songs. The average moves as you go.
            </p>
            <p className="lede measure rv">
              The song average is one input, not the verdict. Everything beside it is a judgement
              you define: keep the defaults, rename them, drop the ones you do not believe in, add
              the ones you do. Leave any of them blank and it simply does not vote, so a record
              with flawless production and nothing to say cannot hide behind its beats.
            </p>
          </div>
        </section>

        <section className="band band-alt" id="export">
          <div className="shell">
            <h2 className="display h2 rv">Finish rating. The post is already made.</h2>
            <p className="lede measure rv">
              Every review exports as slides sized for a phone, laid out so nothing important
              sits under a caption or a button rail. Below is one real export.
            </p>
          </div>
          <Slides slides={SLIDES} />
        </section>

        <section className="band tiktok" id="tiktok">
          <div className="tiktok-wall" aria-hidden="true">
            {WALL_SLIDES.map((src, i) => (
              <img key={`${src}-${i}`} src={src} alt="" loading="lazy" width="180" height="320" />
            ))}
          </div>
          <div className="tiktok-veil" aria-hidden="true" />

          <div className="shell tiktok-grid">
            <div>
              <h2 className="display h2 rv">See it in the wild.</h2>
              <p className="lede measure rv">
                Every slide on this page came out of the tool. They get posted, one album at a
                time, on TikTok.
              </p>
              <a className="btn-tiktok" href={TIKTOK.url} target="_blank" rel="noopener noreferrer">
                {hasAsset('/photos/mark.png')
                  ? <img className="btn-tiktok-mark" src="/photos/mark.png" alt="" width="26" height="26" />
                  : <SocialIcon id="tiktok" size={20} />}
                <span>{TIKTOK.handle}</span>
                <svg width="14" height="14" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                  <path d="M4 11 11 4m0 0H5m6 0v6" stroke="currentColor" strokeWidth="1.6"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
            {hasAsset('/photos/phone.png') || hasAsset('/photos/phone.jpg')
              ? (
                <figure className="phone-shot">
                  <img
                    src={hasAsset('/photos/phone.png') ? '/photos/phone.png' : '/photos/phone.jpg'}
                    alt="One of the exported slides on a phone, mid scroll on TikTok"
                    loading="lazy"
                  />
                </figure>
                )
              : (
                <Placeholder
                  ratio="4 / 5"
                  title="Photograph: a phone mid-scroll"
                  brief="A hand holding a phone with one of the exported slides on screen, shot close and slightly overhead. Dark surroundings, screen as the only real light source. Portrait orientation, at least 1400px wide."
                  credit="Drop the file at public/photos/phone.png and it appears here"
                />
                )}
          </div>
        </section>

        <section className="band board-split-band">
          <div className="shell board-split">
            <ul className="movers glass" aria-hidden="true">
              {[['up', 12], ['up', 4], ['flat', 0], ['down', 7], ['up', 21], ['down', 3]].map(([dir, n], i) => (
                <li key={i}>
                  <span className="movers-rank tnum">{i + 1}</span>
                  <span className="movers-bar"><i style={{ width: `${86 - i * 9}%` }} /></span>
                  <span className={`movers-delta movers-${dir} tnum`}>
                    {dir === 'flat' ? 'hold' : (dir === 'up' ? '▲' : '▼') + ' ' + n}
                  </span>
                </li>
              ))}
            </ul>
            <div>
              <h2 className="display h2 rv">Everything you rate lands in one list.</h2>
              <p className="lede measure rv">
                Re-rate an old record and the list reorders itself, remembering where each album
                used to sit. Freeze it whenever you like and the next update writes itself from
                the difference.
              </p>
            </div>
          </div>
        </section>

        <Wall albums={wall} />


        <section className="band band-alt" id="tiers">
          <div className="shell">
            <h2 className="display h2 rv">Two records a day, for nothing.</h2>
            <p className="lede measure rv">
              Rating is unlimited at every tier, and so is everything social. What a subscription
              buys is how many records a day you turn into slides, and the styles you turn them
              into.
            </p>
            {/* Written from the same table the app enforces, so a price on this
                page cannot say one thing while the product does another. */}
            {/* On a phone this is a swipe deck, so it needs to say so. */}
            <p className="tiers-hint">Swipe to compare</p>
            <div className="tiers">
              {TIER_LIST.map(t => {
                const cap = t.limits.generationsPerDay
                return (
                  <article key={t.key} className={`tier tier-${t.key}`}>
                    <h3>{t.name}</h3>

                    {/* The same order on every card: what you get a day, what
                        it costs, who it is for. Two of them leading on the cap
                        and one on the price is what made the row read as three
                        different designs. */}
                    <p className="tier-cap">
                      <strong className="tnum">{cap === Infinity ? '\u221E' : cap}</strong>
                      <span>{cap === Infinity ? 'no daily limit' : 'records a day'}</span>
                    </p>

                    <p className="tier-price">
                      {t.monthly === 0
                        ? <strong>Free</strong>
                        : <><strong>${t.monthly.toFixed(2)}</strong><em>a month</em></>}
                    </p>
                    <p className="tier-year">
                      {t.yearly > 0 ? `or $${t.yearly.toFixed(2)} a year` : 'No card, ever'}
                    </p>

                    <p className="tier-for">{t.blurb}</p>

                    <ul>
                      {t.perks.map(perk => <li key={perk}>{perk}</li>)}
                    </ul>

                    <div className="tier-do">
                      {t.monthly === 0
                        ? <StartButton />
                        : <CheckoutButton tier={t.key} name={t.name} />}
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        {/* Questions people actually ask, answered honestly. A FAQ that only
            asks the questions the product is happy to answer is an advert with
            question marks in it, so the awkward ones are here too: what the
            free tier really costs you, where the data comes from, and what
            happens to a library when you change the scale under it. */}
        <section className="band faq" id="faq">
          <div className="shell">
            <h2 className="display h2 rv">Before you start</h2>
            <p className="lede measure rv">
              The things worth knowing, including the ones that are not a sales pitch.
            </p>

            <div className="faq-list">
              {FAQS.map(([q, a]) => (
                <details className="faq-item" key={q}>
                  <summary>
                    <span>{q}</span>
                    <i aria-hidden="true" />
                  </summary>
                  <div className="faq-a">{a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="band closer" id="start">
          <div className="shell closer-inner">
            <h2 className="display h2 rv">Put a number on it.</h2>
            <p className="lede closer-sub">
              Two records a day, free, no card. Your first review can be up in ten minutes.
            </p>
            <StartButton large />
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="shell foot-grid">
          <div className="foot-brand">
            <span className="wordmark"><Mark size={21} /><span>Press&nbsp;Play&nbsp;Rankings</span></span>
            <p className="foot-line">Score it properly. Then argue about it.</p>
            <div className="foot-socials">
              {SOCIALS.filter(x => x.url).map(x => (
                <a key={x.id} href={x.url} target="_blank" rel="noopener noreferrer"
                   aria-label={`${x.label}, ${x.handle}`} title={x.handle}>
                  <SocialIcon id={x.id} />
                </a>
              ))}
            </div>
          </div>

          <nav className="foot-col" aria-label="Product">
            <h3>Product</h3>
            <a href="#how">How it works</a>
            <a href="#rating">Rating</a>
            <a href="#reviews">Reviews</a>
            <a href="#export">Export</a>
            <a href="#tiers">Tiers</a>
            <a href="#faq">Questions</a>
          </nav>

          <nav className="foot-col" aria-label="Company">
            <h3>More</h3>
            <a href={TIKTOK.url} target="_blank" rel="noopener noreferrer">TikTok</a>
            <a href="/changelog">Changelog</a>
            <a href="/contact">Contact</a>
          </nav>

          <nav className="foot-col" aria-label="Legal">
            <h3>Legal</h3>
            <a href="/legal/terms">Terms</a>
            <a href="/legal/privacy">Privacy</a>
            <a href="/legal/cookies">Cookies</a>
          </nav>
        </div>
        <div className="shell foot-base">
          <p>&copy; {new Date().getFullYear()} Press Play Rankings.</p>
          <p className="foot-note">
            Cover art belongs to its rights holders and appears here for identification only.
          </p>
        </div>
      </footer>
    </>
  )
}
