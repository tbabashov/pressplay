'use client'

import { useRef, useState } from 'react'

// A cover arrives one of three ways: dropped, chosen, or pasted as a link. All
// three end in the same place, a short URL on the record.
//
// Files are shrunk in the browser before they leave it. A phone photo is four
// thousand pixels wide and a cover is never shown above about a thousand, so
// uploading the original wastes the user's connection and the bucket's quota
// for something nobody can see.
const MAX_EDGE = 1200

async function shrink (file) {
  if (file.type === 'image/gif') return file      // animation would be flattened
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return file
  const { width: w, height: h } = bitmap
  if (Math.max(w, h) <= MAX_EDGE) return file

  const k = MAX_EDGE / Math.max(w, h)
  const c = document.createElement('canvas')
  c.width = Math.round(w * k)
  c.height = Math.round(h * k)
  c.getContext('2d').drawImage(bitmap, 0, 0, c.width, c.height)
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.88))
  return blob ? new File([blob], 'cover.jpg', { type: 'image/jpeg' }) : file
}

export default function ImageInput ({ value, onChange, hint = 'cover', label = 'Cover' }) {
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState(false)
  const [error, setError] = useState('')
  const input = useRef(null)

  const take = async file => {
    if (!file) return
    setError(''); setBusy(true)
    try {
      const small = await shrink(file)
      const body = new FormData()
      body.append('file', small)
      body.append('hint', hint)
      const res = await fetch('/api/upload', { method: 'POST', body })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'That did not upload.')
      onChange(data.url)
    } catch (e) {
      setError(e.message)
    } finally { setBusy(false) }
  }

  return (
    <div className="ii">
      <div
        className={`ii-drop${over ? ' over' : ''}${busy ? ' busy' : ''}`}
        onDragOver={e => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={e => {
          e.preventDefault(); setOver(false)
          take(e.dataTransfer.files?.[0])
        }}
        onClick={() => input.current?.click()}
        role="button" tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') input.current?.click() }}
        aria-label={`${label}: drop an image here or click to choose one`}
      >
        {value
          ? <img src={value} alt="" />
          : <span className="ii-blank" aria-hidden="true" />}
        <span className="ii-hint">
          {busy ? 'Uploading' : over ? 'Drop it' : 'Drop an image, or click'}
        </span>
      </div>

      <input
        ref={input} type="file" hidden
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; take(f) }}
      />

      <label className="ii-url">
        <span>or paste a link</span>
        <input
          value={value && !value.startsWith('data:') ? value : ''}
          onChange={e => onChange(e.target.value)}
          placeholder="https://…"
          spellCheck={false}
        />
      </label>

      {value && (
        <button type="button" className="ii-clear" onClick={() => onChange('')}>Remove</button>
      )}
      {error && <p className="notice notice-bad ii-error">{error}</p>}
    </div>
  )
}
