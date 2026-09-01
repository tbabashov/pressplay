import Hero from '@/components/Hero'
import Wall from '@/components/Wall'
import ReviewDemo from '@/components/ReviewDemo'
import Placeholder from '@/components/Placeholder'
import CoverBand from '@/components/CoverBand'
import Slides from '@/components/Slides'
import { hasAsset } from '@/lib/asset'
import { SignIn, StartButton } from '@/components/AuthButtons'
import Nav from '@/components/Nav'
import wall from '@/lib/wall.json'
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

const SLIDES = [
  { src: '/slides/bp-01.png', label: 'Title card' },
  { src: '/slides/bp-02.png', label: 'Every song, scored' },
  { src: '/slides/bp-03.png', label: 'The rest of them' },
  { src: '/slides/bp-04.png', label: 'The criteria' },
  { src: '/slides/bp-05.png', label: 'Where it lands' },
  { src: '/slides/bp-06.png', label: 'The discography' },
  { src: '/slides/bp-07.png', label: 'The rest of the discography' }
]

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

const Mark = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 17 17" fill="none" aria-hidden="true">
    <circle cx="8.5" cy="8.5" r="7.6" stroke="currentColor" strokeWidth="1.5" />
    <path d="M6.9 5.6v5.8l4.5-2.9z" fill="currentColor" />
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

        <section className="band">
          <div className="shell criteria-grid">
            <div>
              <h2 className="display h2 rv">And the criteria<br />are yours too.</h2>
              <p className="lede measure rv">
                The song average is one input, not the verdict. Everything beside it is a
                judgement you define: keep the defaults, rename them, drop the ones you do not
                believe in, add the ones you do. The final score is the mean of whatever you
                kept, so a record with flawless production and nothing to say cannot hide
                behind its beats.
              </p>
              <p className="lede measure rv">Leave any of them blank and it simply does not vote.</p>
            </div>
            <dl className="criteria-list">
              <div className="criterion">
                <dt>Song average<span className="auto-tag">always on</span></dt>
                <dd>Every track you scored, averaged. The only one you never type.</dd>
              </div>
              {[
                ['Lyricism', 'What is being said, and how well.'],
                ['Production', 'The beats, the mix, the sound of the thing.'],
                ['Delivery', 'Flow, cadence, presence, performance.'],
                ['Album experience', 'Sequencing, pacing, whether it holds front to back.'],
                ['Replay value', 'Whether you will still be playing it next year.']
              ].map(([label, copy]) => (
                <div className="criterion" key={label}>
                  <dt>{label}<span className="edit-tag">yours to change</span></dt>
                  <dd>{copy}</dd>
                </div>
              ))}
            </dl>
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
            <h2 className="display h2 rv">Rate three a day for nothing.</h2>
            <p className="lede measure rv">
              Billing is not switched on, so nothing here has a price and nothing is charged.
            </p>
            <div className="tiers">
              <article className="tier tier-free">
                <h3>Free</h3>
                <p className="tier-cap tnum">3<span>albums a day</span></p>
                <p className="tier-for">For seeing whether you like it.</p>
                <ul>
                  <li>Any scale you build</li>
                  <li>Your own criteria</li>
                  <li>Every export slide, no watermark</li>
                  <li>Your own leaderboard</li>
                </ul>
              </article>

              <article className="tier tier-plus">
                <span className="tier-flag">Most people</span>
                <h3>Plus</h3>
                <p className="tier-cap tnum">10<span>albums a day</span></p>
                <p className="tier-for">For rating most of what you listen to.</p>
                <ul>
                  <li className="tier-inherit">Everything in Free</li>
                  <li>Gradient and crystal glass slides</li>
                  <li>Analytics on your own taste</li>
                  <li>Import a whole discography at once</li>
                </ul>
              </article>

              <article className="tier tier-max">
                <span className="tier-flag">Everything</span>
                <h3>Max</h3>
                <p className="tier-cap tnum">&#8734;<span>no daily limit</span></p>
                <p className="tier-for">For running this like a channel.</p>
                <ul>
                  <li className="tier-inherit">Everything in Plus</li>
                  <li>Export the set as video</li>
                  <li>Your own palette, fonts and watermark</li>
                  <li>Year in review, built automatically</li>
                  <li>Verified profile and pinned reviews</li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section className="band closer" id="start">
          <div className="shell closer-inner">
            <h2 className="display h2 rv">Put a number on it.</h2>
            <p className="lede closer-sub">
              Three albums a day, free, no card. Your first review can be up in ten minutes.
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
