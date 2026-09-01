'use client'

import { useRef, useState } from 'react'

const MAX = 3
const MAX_EDGE = 1000          // plenty at 1080-wide export, far smaller to store

// Transparent cut-outs must stay PNG: re-encoding to JPEG would fill the alpha
// with black and put a box round the artist.
function shrink (file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const c = document.createElement('canvas')
      c.width = w; c.height = h
      c.getContext('2d').drawImage(img, 0, 0, w, h)
      resolve(c.toDataURL('image/png'))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file could not be read as an image.')) }
    img.src = url
  })
}

export default function ArtistImages ({ images, onChange }) {
  const input = useRef(null)
  const [error, setError] = useState('')

  const add = async files => {
    setError('')
    const room = MAX - images.length
    if (room <= 0) { setError(`Three cut-outs is the limit.`); return }
    const picked = [...files].slice(0, room)
    try {
      const next = []
      for (const f of picked) {
        if (!f.type.startsWith('image/')) throw new Error(`${f.name} is not an image.`)
        next.push({ src: await shrink(f), x: 0, y: 0, scale: 1 })
      }
      onChange([...images, ...next])
    } catch (e) { setError(e.message) }
    if (input.current) input.current.value = ''
  }

  const patch = (i, p) => onChange(images.map((im, j) => (j === i ? { ...im, ...p } : im)))
  const drop = i => onChange(images.filter((_, j) => j !== i))

  return (
    <div className="cut">
      <div className="cut-list">
        {images.map((im, i) => (
          <div className="cut-item" key={i}>
            <div className="cut-thumb"><img src={im.src} alt="" /></div>
            <div className="cut-ctrls">
              <strong>Cut-out {i + 1}</strong>
              <span>
                {im.scale && Math.abs(im.scale - 1) > 0.01
                  ? `${Math.round(im.scale * 100)}%`
                  : 'Original size'}
                {(im.x || im.y) ? ' · moved' : ''}
              </span>
              <div className="cut-do">
                <button type="button" className="cut-reset"
                  onClick={() => patch(i, { x: 0, y: 0, scale: 1 })}>
                  Reset position
                </button>
                <button
                  type="button"
                  className={`cut-lock${im.locked ? ' on' : ''}`}
                  onClick={() => patch(i, { locked: !im.locked })}
                  aria-pressed={!!im.locked}
                  title={im.locked ? 'Unlock to move it again' : 'Lock it where it is'}
                >
                  {im.locked
                    ? <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" fill="currentColor" /><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="1.9" /></svg>
                    : <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="1.9" /><path d="M8 11V8a4 4 0 0 1 7.5-1.9" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></svg>}
                  {im.locked ? 'Locked' : 'Lock'}
                </button>
              </div>
            </div>
            <button className="cut-x" onClick={() => drop(i)} aria-label={`Remove cut-out ${i + 1}`}>
              <svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11m0-11l-11 11" fill="none"
                stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
            </button>
          </div>
        ))}
      </div>

      {images.length < MAX && (
        <>
          <button className="cut-add" onClick={() => input.current?.click()}>
            Add a transparent PNG
          </button>
          <input ref={input} type="file" accept="image/png,image/webp" multiple hidden
            onChange={e => add(e.target.files)} />
          <p className="cut-hint">
            Cut-outs stand in the dome on the title card. Up to three, background already removed. Click one on the title card to pick it up, then drag to move it, drag a corner to resize it from the opposite corner, or scroll on it. Arrow keys nudge it a few pixels at a time, shift with them moves further, and + and − resize. Reset position puts it back. Lock one once it is right and it stops responding, so placing the next will not knock it out of position.</p>
        </>
      )}
      {error && <p className="cut-error">{error}</p>}
    </div>
  )
}
