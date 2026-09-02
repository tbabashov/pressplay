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
    tiktok: 'M16.6 2h-3.1v13.4a2.5 2.5 0 1 1-2.1-2.47V9.75a5.9 5.9 0 1 0 5.2 5.86V8.9a7.7 7.7 0 0 0 4.4 1.4V7.2a4.6 4.6 0 0 1-4.4-4.6V2z',
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

const STEPS = [
  ['Find it', 'Search once and get the real tracklist, artwork and running times.'],
  ['Play it', 'Thirty second previews sit next to every track.'],
  ['Score it', 'Rate each song on the scale you built. Skits get marked N/A and stay out of the average.'],
  ['Publish it', 'Weigh your criteria, get your number, export the slides.']
]

const GoogleMark = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-2.8-.4-4H24v7.3h12.1c-.2 2-1.6 5-4.5 7l6.9 5.4c4.1-3.8 6.6-9.4 6.6-15.7z"/>
    <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.4c-1.9 1.3-4.4 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-7.1 5.5C8 41.3 15.4 46 24 46z"/>
    <path fill="#FBBC05" d="M11.5 28.4c-.5-1.4-.7-2.9-.7-4.4s.3-3 .7-4.4l-7.1-5.5C2.9 17 2 20.4 2 24s.9 7 2.4 9.9l7.1-5.5z"/>
    <path fill="#EA4335" d="M24 10.5c4.1 0 6.9 1.8 8.5 3.2l6.2-6C34.9 4.2 29.9 2 24 2 15.4 2 8 6.7 4.4 14.1l7.1 5.5c1.8-5.3 6.7-9.1 12.5-9.1z"/>
  </svg>
)



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

        <section className="band" id="rating">
          <div className="shell">
            <h2 className="display h2 rv">Score it song by song.</h2>
            <p className="lede measure rv">
              The whole record, one row at a time, with a preview of every track so you are
              rating what you actually heard. Type a number from 0 to 11, or a dash for the skits
              that were never trying to be songs. The average moves as you go.
            </p>
            <p className="lede measure rv">
              The song average is one input, not the verdict. Everything beside it is a judgement
              you define: keep the defaults, rename them, drop the ones you do not believe in, add
              the ones you do. Leave any of them blank and it simply does not vote — so a record
              with flawless production and nothing to say cannot hide behind its beats.
            </p>
          </div>

          {/* The real screen, not a drawing of it: Late Registration, all
              twenty one tracks scored, the criteria panel open beside them. */}
          <figure className="ratefig rv">
            <img
              src="/photos/rating-late-registration.jpg"
              alt="Late Registration being rated: every track scored from 0 to 11, with the criteria panel and a final score of 9.4"
              width="1800" height="1473" loading="lazy"
            />
            <figcaption>Late Registration, all twenty one tracks scored. Final: 9.4.</figcaption>
          </figure>
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
            <span className="wordmark"><Mark size={15} /><span>Press&nbsp;Play&nbsp;Rankings</span></span>
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
          </nav>

          <nav className="foot-col" aria-label="Company">
            <h3>More</h3>
            <a href={TIKTOK.url} target="_blank" rel="noopener noreferrer">TikTok</a>
            <a href="/changelog">Changelog</a>
            <a href="/contact">Contact</a>
          </nav>

          <nav className="foot-col" aria-label="Legal">
            <h3>Legal</h3>
            <a href="/terms">Terms</a>
            <a href="/privacy">Privacy</a>
            <a href="/cookies">Cookies</a>
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
