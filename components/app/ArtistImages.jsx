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
              <label>
                <span>Size</span>
                <input type="range" min="0.4" max="2.2" step="0.05" value={im.scale}
                  onChange={e => patch(i, { scale: Number(e.target.value) })}
                  aria-label={`Cut-out ${i + 1} size`} />
              </label>
              <label>
                <span>Across</span>
                <input type="range" min="-260" max="260" step="4" value={im.x}
                  onChange={e => patch(i, { x: Number(e.target.value) })}
                  aria-label={`Cut-out ${i + 1} horizontal position`} />
              </label>
              <label>
                <span>Up</span>
                <input type="range" min="-220" max="220" step="4" value={-im.y}
                  onChange={e => patch(i, { y: -Number(e.target.value) })}
                  aria-label={`Cut-out ${i + 1} vertical position`} />
              </label>
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
            Cut-outs stand in the dome on the title card. Up to three, background already removed.
          </p>
        </>
      )}
      {error && <p className="cut-error">{error}</p>}
    </div>
  )
}
