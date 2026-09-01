'use client'

import { SCALE_PRESETS, TIER_NAME_MAX, rampColour, readableOn } from '@/lib/scales'

// PRODUCT.md: a scale is an ordered list of tiers, each with a value, a name and
// a colour, plus one value reservable as N/A so interludes stay out of the
// average. The eleven with a Majestic on top is a preset, not the rule.
export default function ScaleBuilder ({ scale, onChange }) {
  const pick = preset => onChange({ ...preset, tiers: preset.tiers.map(t => ({ ...t })) })

  const rename = (value, name) => onChange({
    ...scale, id: 'custom',
    tiers: scale.tiers.map(t => (t.value === value ? { ...t, name: name.slice(0, TIER_NAME_MAX) } : t))
  })

  const recolour = (value, colour) => onChange({
    // Colouring a tier by hand takes the ladder off the house look, since the
    // signature gradients are not a colour anyone can type.
    ...scale, id: 'custom', signature: false,
    tiers: scale.tiers.map(t => (t.value === value ? { ...t, colour } : t))
  })

  const swatch = t => t.colour || (scale.signature ? null : rampColour(t.value, scale.max))

  return (
    <div className="sb">
      <div className="rm-presets">
        {SCALE_PRESETS.map(p => (
          <button
            type="button" key={p.id} title={p.note}
            className={`rm-preset${scale.id === p.id ? ' on' : ''}`}
            onClick={() => pick(p)}
          >
            {p.name}
          </button>
        ))}
      </div>

      <label className="sb-na">
        <input
          type="checkbox" checked={scale.na !== false}
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
                maxLength={TIER_NAME_MAX}
                aria-label={`Name for ${t.value}`}
              />
              <input
                type="color"
                className="sb-colour"
                value={hex || '#8b5cf6'}
                onChange={e => recolour(t.value, e.target.value)}
                aria-label={`Colour for ${t.value}`}
              />
            </li>
          )
        })}
      </ul>

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
