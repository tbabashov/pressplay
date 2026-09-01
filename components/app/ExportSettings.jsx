'use client'

import { ALIGNMENTS, TEXT_SIZES, FEATURE_DROPS } from '../../lib/export/shell.jsx'
import { STYLE_LIST } from '../../lib/export/styles.js'

export const SWATCHES = [
  ['auto', 'From cover', null],
  ['gold', 'Gold', '#e2aa4a'],
  ['crimson', 'Crimson', '#d1495b'],
  ['violet', 'Violet', '#8b5cf6'],
  ['ocean', 'Ocean', '#2563eb'],
  ['mint', 'Mint', '#14b8a6'],
  ['ember', 'Ember', '#f97316'],
  ['bone', 'Bone', '#d8d4cc']
]

export const PER_PAGE = [['auto', 'Auto'], [10, '10'], [12, '12'], [14, '14'], [16, '16'], [18, '18']]
export const DISC_PER_PAGE = [[6, '6'], [9, '9'], [12, '12']]
export const SCALE_PLACEMENTS = [['first', 'First songs slide'], ['every', 'Every songs slide'], ['off', 'Off']]
export const SLIDES = [
  ['title', 'Title card'], ['songs', 'Songs'], ['criteria', 'Criteria'],
  ['rank', 'Where it lands'], ['discography', 'Discography']
]

function Row ({ label, hint, children }) {
  return (
    <div className="set-row">
      <div>
        <span>{label}</span>
        {hint && <em>{hint}</em>}
      </div>
      <div className="set-control">{children}</div>
    </div>
  )
}

function Segments ({ options, value, onChange, name }) {
  return (
    <div className="seg" role="radiogroup" aria-label={name}>
      {options.map(([v, label]) => (
        <button
          key={String(v)}
          role="radio"
          aria-checked={value === v}
          className={value === v ? 'on' : ''}
          onClick={() => onChange(v)}
        >{label}</button>
      ))}
    </div>
  )
}

function Toggle ({ on, onChange, label }) {
  return (
    <button className={`sw${on ? ' on' : ''}`} role="switch" aria-checked={on}
      aria-label={label} onClick={() => onChange(!on)}>
      <i />
    </button>
  )
}

export default function ExportSettings ({ open, onClose, settings, set, onReset, paid = false }) {
  const active = STYLE_LIST.find(s => s.id === settings.style) || STYLE_LIST[0]
  return (
    <>
      <div className={`set-scrim${open ? ' show' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`set${open ? ' open' : ''}`} aria-label="Export settings" aria-hidden={!open}>
        <header className="set-head">
          <h2>Settings</h2>
          <button onClick={onClose} aria-label="Close settings">
            <svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11m0-11l-11 11" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </header>

        <div className="set-body">
          <section>
            <h3>Look</h3>
            <Row label="Gradient background" hint="Pools of colour pulled from the cover">
              <Toggle on={settings.gradient} onChange={v => set('gradient', v)} label="Gradient background" />
            </Row>
            {active.glassChoice && (
              <Row label="Crystal glass" hint="Frosted panels behind each block">
                <Toggle on={settings.glass} onChange={v => set('glass', v)} label="Crystal glass" />
              </Row>
            )}
            <Row label="Background" hint="Overrides the colour taken off the cover">
              <div className="bgpick">
                <input
                  type="color"
                  value={settings.bg || '#171720'}
                  onChange={e => set('bg', e.target.value)}
                  aria-label="Background colour"
                />
                {settings.bg && (
                  <button className="bgclear" onClick={() => set('bg', null)}>Use the cover</button>
                )}
              </div>
            </Row>
            <Row label="Accent colour">
              <div className="sws">
                {SWATCHES.map(([id, name, hex]) => (
                  <button
                    key={id}
                    className={`sw-dot${settings.accent === id ? ' on' : ''}${hex ? '' : ' auto'}`}
                    style={hex ? { background: hex } : undefined}
                    onClick={() => set('accent', id)}
                    title={name}
                    aria-label={name}
                    aria-pressed={settings.accent === id}
                  >{hex ? null : 'A'}</button>
                ))}
              </div>
            </Row>
          </section>

          <section>
            <h3>Layout</h3>
            <Row label="Content sits" hint="Which end of the frame a block settles against">
              <Segments name="Alignment" options={ALIGNMENTS} value={settings.align} onChange={v => set('align', v)} />
            </Row>
            <Row label="Songs per image">
              <Segments name="Songs per image" options={PER_PAGE} value={settings.perPage} onChange={v => set('perPage', v)} />
            </Row>
            <Row label="Fill discographies automatically"
              hint="Everything else the artist released, added for you">
              <Toggle on={settings.autoDiscography !== false}
                onChange={v => set('autoDiscography', v)} label="Fill discographies automatically" />
            </Row>
            <Row label="Albums per discography image">
              <Segments name="Albums per discography image" options={DISC_PER_PAGE}
                value={settings.discPerPage} onChange={v => set('discPerPage', v)} />
            </Row>
            <Row label="Dome on the title card" hint="The glass semicircle the cut-outs stand in">
              <Toggle on={settings.dome !== false} onChange={v => set('dome', v)} label="Dome" />
            </Row>
          </section>

          <section>
            <h3>Type</h3>
            <Row label="Song text size" hint="Every row always shares one size">
              <Segments name="Song text size" options={TEXT_SIZES} value={settings.textSize} onChange={v => set('textSize', v)} />
            </Row>
            <Row label="Feature size" hint="How much smaller the ft. credit is">
              <Segments name="Feature size" options={FEATURE_DROPS} value={settings.featureDrop} onChange={v => set('featureDrop', v)} />
            </Row>
          </section>

          <section>
            <h3>Slides</h3>
            <Row label="Rating scale">
              <Segments name="Rating scale" options={SCALE_PLACEMENTS} value={settings.scale} onChange={v => set('scale', v)} />
            </Row>
            {SLIDES.map(([id, label]) => (
              <Row key={id} label={label}>
                <Toggle
                  on={settings.include[id] !== false}
                  onChange={v => set('include', { ...settings.include, [id]: v })}
                  label={label}
                />
              </Row>
            ))}
          </section>

          <section>
            <h3>Credits</h3>
            <Row
              label="Press Play credit"
              hint={paid
                ? 'Yours to turn off.'
                : 'A small mark in the corner. Removing it comes with a subscription.'}
            >
              <Toggle
                on={settings.watermark !== false}
                onChange={v => { if (paid || v) set('watermark', v) }}
                label="Press Play credit"
              />
            </Row>
            <Row label="Your handle" hint="Your own credit across the slide. Optional, and yours either way.">
              <Toggle
                on={settings.showHandle !== false}
                onChange={v => set('showHandle', v)}
                label="Show your handle"
              />
            </Row>
            <Row label="Handle">
              <input
                className="handle-input"
                value={settings.handle ?? '@the.press.play'}
                onChange={e => set('handle', e.target.value)}
                aria-label="Watermark handle"
              />
            </Row>
          </section>

          <section>
            <h3>Preview</h3>
            <Row label="Show TikTok safe zones" hint="Preview only, never exported">
              <Toggle on={settings.safeZones} onChange={v => set('safeZones', v)} label="Safe zones" />
            </Row>
          </section>

          <button className="set-reset" onClick={onReset}>Reset everything to defaults</button>
        </div>
      </aside>
    </>
  )
}
