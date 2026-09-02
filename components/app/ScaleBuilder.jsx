'use client'

import { useState } from 'react'
import {
  SCALE_PRESETS, SCALE_MAX_CEILING, TIER_NAME_MAX, rampColour, readableOn
} from '@/lib/scales'

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

export default function ScaleBuilder ({ scale, onChange, locked = false }) {
  const [adding, setAdding] = useState('')

  const pick = preset => onChange({ ...preset, tiers: preset.tiers.map(t => ({ ...t })) })

  // Anything below is a change to the ladder itself, so it stops being the
  // preset it started as.
  const edit = patch => onChange({ ...scale, id: 'custom', ...patch })

  const rename = (value, name) => edit({
    tiers: scale.tiers.map(t => (t.value === value ? { ...t, name: name.slice(0, TIER_NAME_MAX) } : t))
  })

  const recolour = (value, colour) => edit({
    // Colouring a tier by hand takes the ladder off the house look, since the
    // signature gradients are not a colour anyone can type.
    signature: false,
    tiers: scale.tiers.map(t => (t.value === value ? { ...t, colour } : t))
  })

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

  const swatch = t => t.colour || (scale.signature ? null : rampColour(t.value, scale.max))

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
          const hex = swatch(t)
          return (
            <li key={t.value}>
              <span
                className="sb-chip tnum"
                style={hex ? { background: hex, color: readableOn(hex) } : undefined}
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
              <input
                type="color"
                className="sb-colour"
                value={hex || '#8b5cf6'}
                onChange={e => recolour(t.value, e.target.value)} disabled={locked}
                aria-label={`Colour for ${t.value}`}
              />
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
