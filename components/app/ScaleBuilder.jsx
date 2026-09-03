'use client'

import { useState } from 'react'
import {
  SCALE_PRESETS, SCALE_MAX_CEILING, TIER_NAME_MAX, rampColour, readableOn
} from '@/lib/scales'
import { chipColour } from '@/lib/rating-colors'

// PRODUCT.md: a scale is an ordered list of tiers, each with a value, a name and
// a colour, plus one value reservable as N/A so interludes stay out of the
// average. The eleven with a Majestic on top is a preset, not the rule.
//
// The presets were the only way through here, which made "custom" mean renaming
// and recolouring somebody else's ladder. normaliseScale has always accepted any
// top from 1 to 100 and any set of steps under it, so the shape of the scale is
// editable now too: its top, its steps, and what the whole thing is called.
const SCALE_NAME_MAX = 32

// Two steps is the fewest that still sorts anything into anything. One step
// names every score the same, which is not a scale.
const MIN_TIERS = 2

// A shade of the same colour, for the far end of a new gradient.
const darken = (h, by = 0.34) => {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(h || '')
  if (!m) return h
  const c = [1, 2, 3].map(i => Math.round(parseInt(m[i], 16) * (1 - by)))
  return `#${c.map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')}`
}

export default function ScaleBuilder ({ scale, onChange, locked = false }) {
  const [adding, setAdding] = useState('')

  const pick = preset => onChange({ ...preset, tiers: preset.tiers.map(t => ({ ...t })) })

  // Starting your own. The rungs keep the colours they are showing right now
  // rather than going blank or grey, so it begins from what is on screen and
  // is edited from there. On the house ladder those colours are null and the
  // swatches were all showing the same placeholder purple, which is what made
  // it look like there was nothing to customise.
  const startCustom = () => onChange({
    ...scale,
    id: 'custom',
    name: scale.name && scale.id !== 'custom' ? `${scale.name} (yours)` : (scale.name || 'Custom'),
    signature: false,
    tiers: scale.tiers.map(t => {
      if (t.colour) return { ...t }
      const bg = chipColour(t.value, scale.signature ? null : scale).bg || ''
      const stops = bg.match(/#[0-9a-f]{6}/gi) || []
      return {
        ...t,
        colour: stops[0] || rampColour(t.value, scale.max),
        colour2: stops[1] || null
      }
    })
  })

  // Anything below is a change to the ladder itself, so it stops being the
  // preset it started as.
  const edit = patch => onChange({ ...scale, id: 'custom', ...patch })

  const rename = (value, name) => edit({
    tiers: scale.tiers.map(t => (t.value === value ? { ...t, name: name.slice(0, TIER_NAME_MAX) } : t))
  })

  const recolour = (value, patch) => edit({
    // Colouring a tier by hand takes the ladder off the house look, since the
    // signature gradients are not a colour anyone can type.
    signature: false,
    tiers: scale.tiers.map(t => (t.value === value ? { ...t, ...patch } : t))
  })

  // A rung is a gradient when it has a second colour. Turning it on starts from
  // a darker version of the colour already there, so it reads as a shade of the
  // same rung rather than an unrelated second colour to go and pick.
  const toggleGradient = (value, on) => {
    const t = scale.tiers.find(x => x.value === value)
    const paint = effective(t)
    // The colour is written down either way. A rung on the house ladder has
    // none of its own, so without this, switching its gradient off would leave
    // it with nothing and it would fall back to the ramp.
    recolour(value, on
      ? { colour: paint.a, colour2: paint.b || darken(paint.a) }
      : { colour: paint.a, colour2: null })
  }

  const setMax = raw => {
    const max = Math.round(Number(raw))
    if (!Number.isFinite(max) || max < 1 || max > SCALE_MAX_CEILING) return
    // Steps above the new top cannot survive it. The ones below keep the names
    // and colours they were given rather than being regenerated, so moving the
    // top of a ladder you have already named does not wipe the naming. The top
    // itself always gets a step, or the best score on the scale has no name.
    const kept = scale.tiers.filter(t => t.value <= max)
    edit({
      max,
      // The signature gradients were drawn for the eleven. On any other ladder
      // they are a promise the exported slides cannot keep.
      signature: scale.signature && max === 11,
      tiers: kept.some(t => t.value === max)
        ? kept
        : [{ value: max, name: '', colour: null }, ...kept]
    })
  }

  const removeTier = value => {
    if (scale.tiers.length <= MIN_TIERS) return
    edit({ tiers: scale.tiers.filter(t => t.value !== value) })
  }

  const addTier = () => {
    const value = Math.round(Number(adding))
    if (!Number.isFinite(value) || value < 0 || value > scale.max) return
    if (scale.tiers.some(t => t.value === value)) return
    edit({
      tiers: [...scale.tiers, { value, name: '', colour: null }]
        .sort((a, b) => b.value - a.value)
    })
    setAdding('')
  }

  // What a rung actually looks like, even when the scale stores no colour for
  // it. The house ladder stores none, because its 10 and 11 are gradients and
  // the rest come off a ramp, so every swatch fell back to one placeholder
  // purple and the column of numbers went grey. It looked like the colours had
  // been lost when they were only never written down.
  const effective = t => {
    if (t.colour) return { a: t.colour, b: t.colour2 || null }
    const bg = String(chipColour(t.value, scale.signature ? null : scale).bg || '')
    const stops = bg.match(/#[0-9a-f]{6}/gi) || []
    return { a: stops[0] || rampColour(t.value, scale.max), b: stops[1] || null }
  }
  const swatch = t => effective(t).a
  const isGradient = t => Boolean(effective(t).b)

  const addNum = Math.round(Number(adding))
  const canAdd = adding !== '' && Number.isFinite(addNum) &&
    addNum >= 0 && addNum <= scale.max && !scale.tiers.some(t => t.value === addNum)

  return (
    <div className={`sb${locked ? ' sb-locked' : ''}`}>
      <div className="rm-presets">
        {SCALE_PRESETS.map(p => (
          <button
            type="button" key={p.id} title={p.note}
            className={`rm-preset${scale.id === p.id ? ' on' : ''}`}
            onClick={() => pick(p)} disabled={locked}
          >
            {p.name}
          </button>
        ))}
        {/* Named, so building your own is a thing you can see and press rather
            than something you discover by editing a preset until it stops
            being one. */}
        <button
          type="button"
          title="Start from what is on screen and change anything"
          className={`rm-preset${scale.id === 'custom' ? ' on' : ''}`}
          onClick={startCustom} disabled={locked}
        >
          Custom
        </button>
      </div>

      <div className="sb-shape">
        <label className="sb-shape-field">
          <span>Name</span>
          <input
            value={scale.name || ''}
            onChange={e => edit({ name: e.target.value.slice(0, SCALE_NAME_MAX) })}
            placeholder="Custom"
            maxLength={SCALE_NAME_MAX} disabled={locked}
          />
        </label>
        <label className="sb-shape-field sb-shape-max">
          <span>Top score</span>
          <input
            type="number" inputMode="numeric"
            min={1} max={SCALE_MAX_CEILING}
            value={scale.max}
            onChange={e => setMax(e.target.value)} disabled={locked}
          />
        </label>
      </div>

      <label className="sb-na">
        <input
          type="checkbox" checked={scale.na !== false} disabled={locked}
          onChange={e => onChange({ ...scale, na: e.target.checked })}
        />
        <span>Allow N/A</span>
        <em>Skits and interludes get a dash and stay out of every average.</em>
      </label>

      <ul className="sb-tiers glass-list">
        {scale.tiers.map(t => {
          const paint = effective(t)
          const hex = paint.a
          const fill = paint.b
            ? `linear-gradient(180deg, ${paint.a} 0%, ${paint.b} 100%)`
            : paint.a
          return (
            <li key={t.value}>
              <span
                className="sb-chip tnum"
                style={hex ? { background: fill, color: readableOn(hex) } : undefined}
                data-house={hex ? undefined : 'on'}
              >
                {t.value}
              </span>
              <input
                value={t.name}
                onChange={e => rename(t.value, e.target.value)}
                placeholder="Unnamed"
                maxLength={TIER_NAME_MAX} disabled={locked}
                aria-label={`Name for ${t.value}`}
              />
              <span className="sb-paint">
                <input
                  type="color"
                  className="sb-colour"
                  value={hex || '#8b5cf6'}
                  onChange={e => recolour(t.value, { colour: e.target.value })} disabled={locked}
                  aria-label={`Colour for ${t.value}`}
                />
                {isGradient(t) && (
                  <input
                    type="color"
                    className="sb-colour"
                    value={paint.b}
                    onChange={e => recolour(t.value, { colour2: e.target.value })} disabled={locked}
                    aria-label={`Second colour for ${t.value}`}
                  />
                )}
                <button
                  type="button"
                  className={`sb-grad${isGradient(t) ? ' on' : ''}`}
                  onClick={() => toggleGradient(t.value, !isGradient(t))}
                  disabled={locked}
                  aria-pressed={isGradient(t)}
                  title={isGradient(t) ? 'Make it one flat colour' : 'Shade it into a second colour'}
                  aria-label={`Gradient for ${t.value}`}
                >
                  <i aria-hidden="true" />
                </button>
              </span>
              <button
                type="button"
                className="sb-drop"
                onClick={() => removeTier(t.value)}
                disabled={locked || scale.tiers.length <= MIN_TIERS}
                title={scale.tiers.length <= MIN_TIERS
                  ? 'A scale needs at least two steps'
                  : `Remove the step at ${t.value}`}
                aria-label={`Remove the step at ${t.value}`}
              >
                &times;
              </button>
            </li>
          )
        })}
      </ul>

      <div className="sb-add">
        <input
          type="number" inputMode="numeric"
          min={0} max={scale.max}
          value={adding}
          onChange={e => setAdding(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTier() } }}
          placeholder="0" disabled={locked}
          aria-label={`A score between 0 and ${scale.max} to add a step at`}
        />
        <button type="button" className="btn-ghost sb-add-go" onClick={addTier} disabled={locked || !canAdd}>
          Add a step
        </button>
        <span className="sb-note">
          A step names every score from it up to the next one, so a ladder does not need one
          on every number.
        </span>
      </div>

      {scale.signature && (
        <p className="sb-note">
          The house ladder keeps the colours the exported slides were built on: the eleven is a
          pink gradient with a halo and the ten a blue one, and neither is a colour that can be
          typed. Picking any colour here makes it yours instead.
        </p>
      )}
    </div>
  )
}
