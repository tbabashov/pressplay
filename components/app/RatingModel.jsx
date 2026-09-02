'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CRITERIA_PRESETS, CRITERIA_MAX, SUPERLATIVE_MAX,
  LABEL_MAX, keyFromLabel, clampLabel
} from '@/lib/preferences'
import SuperlativePicker from './SuperlativePicker'
import ScaleBuilder from './ScaleBuilder'
import { normaliseScale, DEFAULT_SCALE } from '@/lib/scales'

export default function RatingModel ({ initial, can = { scales: true, criteria: true } }) {
  const [criteria, setCriteria] = useState(initial.criteria)
  const [supers, setSupers] = useState(initial.superlatives)
  const [scale, setScale] = useState(initial.scale || DEFAULT_SCALE)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const touch = fn => (...a) => { setSaved(false); fn(...a) }

  // Renaming keeps the key. A review already carries its scores filed under it,
  // and changing the key would orphan every one of them.
  const rename = touch((i, label) =>
    setCriteria(list => list.map((c, n) => (n === i ? { ...c, label } : c))))

  const remove = touch(i => setCriteria(list => list.filter((_, n) => n !== i)))

  const add = touch(() => setCriteria(list => {
    if (list.length >= CRITERIA_MAX) return list
    let key = 'criterion'; let n = 2
    while (list.some(c => c.key === key)) key = `criterion${n++}`
    return [...list, { key, label: '' }]
  }))

  const usePreset = touch(p => setCriteria(p.criteria.map(c => ({ ...c }))))

  const toggle = touch(key => setSupers(list =>
    list.includes(key)
      ? list.filter(k => k !== key)
      : (list.length >= SUPERLATIVE_MAX ? list : [...list, key])))

  const submit = async e => {
    e.preventDefault()
    setBusy(true); setError(''); setSaved(false)

    // A blank label would save as a criterion with no name, so the label is
    // what names it and an empty one is dropped rather than stored.
    const cleaned = criteria
      .map(c => ({ key: c.key, label: clampLabel(c.label) }))
      .filter(c => c.label)
      .map(c => (c.key.startsWith('criterion') ? { ...c, key: keyFromLabel(c.label) || c.key } : c))

    try {
      const res = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ criteria: cleaned, superlatives: supers, scale: normaliseScale(scale) })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'That did not save.')
      setCriteria(data.preferences.criteria)
      setSupers(data.preferences.superlatives)
      setScale(data.preferences.scale)
      setSaved(true)
      router.refresh()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  return (
    <form className="rm" onSubmit={submit}>
      <section className="rm-block">
        <h2 className="rm-h2">Scale</h2>
        <p className="rm-note">
          What a song can be given, and what each rung is called. The eleven with a Majestic on
          top is the ladder this site was built on, not a rule: pick another, rename the rungs,
          or colour them yourself.
        </p>
        {!can.scales && (
          <p className="rm-locked">
            Your own scale is a Plus feature. The eleven point ladder is yours either way, and
            anything you change here would be put back when it saved rather than kept, so it is
            shown as it is. <Link href="/tiers">See what each tier includes</Link>.
          </p>
        )}
        <ScaleBuilder scale={scale} onChange={touch(setScale)} locked={!can.scales} />
      </section>

      <section className="rm-block">
        <h2 className="rm-h2">Criteria</h2>
        <p className="rm-note">
          The song average always counts and is never typed. Everything beside it is yours:
          rename them, drop the ones you do not believe in, add the ones you do. Your score is
          the mean of whatever you keep plus the song average.
        </p>

        <div className="rm-presets">
          {CRITERIA_PRESETS.map(p => (
            <button type="button" key={p.id} className="rm-preset" onClick={() => usePreset(p)} title={p.note}>
              {p.name}
            </button>
          ))}
        </div>

        <ul className="rm-list glass-list">
          {criteria.map((c, i) => (
            <li key={c.key}>
              <input
                value={c.label}
                onChange={e => rename(i, e.target.value)}
                maxLength={LABEL_MAX}
                placeholder="Name this criterion"
                aria-label={`Criterion ${i + 1}`}
              />
              <button type="button" onClick={() => remove(i)} aria-label={`Remove ${c.label || 'this criterion'}`}>
                <svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11m0-11l-11 11" fill="none"
                  stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
              </button>
            </li>
          ))}
          {criteria.length === 0 && (
            <li className="rm-empty">No criteria. Your score will be the song average alone.</li>
          )}
        </ul>

        {criteria.length < CRITERIA_MAX && (
          <button type="button" className="rm-add" onClick={add}>Add a criterion</button>
        )}
      </section>

      <section className="rm-block">
        <h2 className="rm-h2">Superlatives</h2>
        <p className="rm-note">
          The picks you hand out on every album. Turn on the ones you want and the rating screen
          shows those and nothing else. Up to {SUPERLATIVE_MAX}.
        </p>

        <SuperlativePicker chosen={supers} onToggle={toggle} />
      </section>

      <div className="rm-actions">
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Saving' : 'Save rating model'}
        </button>
        {saved && <span className="pf-saved">Saved.</span>}
      </div>
      {error && <p className="notice notice-bad">{error}</p>}
    </form>
  )
}
