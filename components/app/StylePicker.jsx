'use client'

import { STYLE_LIST } from '../../lib/export/styles.js'
import { canUseStyle, TIER_DETAIL, TIERS } from '../../lib/tiers'

// The style is not a setting. It decides what the whole set of slides looks
// like, so it gets its own door next to Settings rather than sitting at the top
// of a panel of toggles.
export default function StylePicker ({ open, onClose, settings, set, tier = 'free', onLocked }) {
  // Which tier a style needs, rather than a single paid flag: Aurora comes
  // with Plus and Press Play only with Max, and saying "Plus" against both
  // would be a promise the smaller subscription does not keep.
  const needs = st => TIERS.find(t => canUseStyle(t, st.id))
  const locked = st => !canUseStyle(tier, st.id)

  return (
    <>
      <button
        className={`set-scrim${open ? ' on' : ''}`}
        onClick={onClose}
        aria-label="Close styles"
        tabIndex={open ? 0 : -1}
      />
      <aside className={`set${open ? ' open' : ''}`} aria-label="Slide style" aria-hidden={!open}>
        <header className="set-head">
          <h2>Style</h2>
          <button onClick={onClose} aria-label="Close styles">
            <svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11m0-11l-11 11" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </header>

        <div className="set-body">
          <section>
            <div className="styles">
              {STYLE_LIST.map(st => {
                const isLocked = locked(st)
                return (
                  <button
                    key={st.id}
                    className={`style${settings.style === st.id ? ' on' : ''}${isLocked ? ' locked' : ''}`}
                    // A locked style opens the subscription screen rather than
                    // doing nothing. Silently ignoring the press is the worst
                    // of both: it reads as broken, and it never says why.
                    onClick={() => (isLocked
                      ? onLocked?.(`${st.name} comes with ${TIER_DETAIL[needs(st)]?.name || 'Plus'}.`)
                      : set('style', st.id))}
                    aria-pressed={settings.style === st.id}
                    aria-disabled={isLocked}
                  >
                    <span className={`style-swatch sw-${st.id}`} aria-hidden="true" />
                    <span className="style-text">
                      <strong>
                        {st.name}
                        {isLocked && <em>{TIER_DETAIL[needs(st)]?.name || 'Plus'}</em>}
                      </strong>
                      <span>{st.blurb}</span>
                    </span>
                  </button>
                )
              })}
            </div>
            {STYLE_LIST.some(locked) && (
              <p className="style-note">
                Aurora comes with Plus and Press Play with Max. The rest are yours at every tier.{' '}
                <a href="/app/tiers">See the tiers</a>.
              </p>
            )}
          </section>
        </div>
      </aside>
    </>
  )
}
