'use client'

import { STYLE_LIST } from '../../lib/export/styles.js'

// The style is not a setting. It decides what the whole set of slides looks
// like, so it gets its own door next to Settings rather than sitting at the top
// of a panel of toggles.
export default function StylePicker ({ open, onClose, settings, set, paid }) {
  const locked = st => st.tier === 'paid' && !paid

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
                    onClick={() => !isLocked && set('style', st.id)}
                    aria-pressed={settings.style === st.id}
                    aria-disabled={isLocked}
                  >
                    <span className={`style-swatch sw-${st.id}`} aria-hidden="true" />
                    <span className="style-text">
                      <strong>{st.name}{st.tier === 'paid' && <em>Plus</em>}</strong>
                      <span>{st.blurb}</span>
                    </span>
                  </button>
                )
              })}
            </div>
            {!paid && (
              <p className="style-note">
                Aurora and Press Play come with a subscription. The other three are yours.
              </p>
            )}
          </section>
        </div>
      </aside>
    </>
  )
}
