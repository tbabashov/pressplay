'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { slugify, HANDLE_MAX, BIO_MAX } from '@/lib/profile'
import { fetchJson } from '@/lib/fetch-json'

// A picture is squared off and shrunk in the browser before it is sent. The
// store is a JSON file that gets parsed on every read, and a full size photo
// inlined into it is exactly the weight that made the app slow before.
const AVATAR = 256
function squareToDataUrl (file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('That file could not be read.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('That file is not an image.'))
      img.onload = () => {
        const side = Math.min(img.width, img.height)
        const c = document.createElement('canvas')
        c.width = c.height = AVATAR
        const ctx = c.getContext('2d')
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, AVATAR, AVATAR)
        resolve(c.toDataURL('image/jpeg', 0.82))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

export default function ProfileForm ({ profile }) {
  const [name, setName] = useState(profile.name || '')
  const [handle, setHandle] = useState(profile.handle || '')
  const [bio, setBio] = useState(profile.bio || '')
  const [image, setImage] = useState(profile.image || null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  const submit = async e => {
    e.preventDefault()
    setBusy(true); setError(''); setSaved(false)
    try {
      const data = await fetchJson('/api/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, handle, bio, image })
      })
      setHandle(data.profile.handle)
      setSaved(true)
      router.refresh()
    } catch (e) {
      setError(e.message)
    } finally { setBusy(false) }
  }

  return (
    <form className="pf" onSubmit={submit}>
      <div className="pf-avatar">
        {image
          ? <img src={image} alt="" width="72" height="72" referrerPolicy="no-referrer" />
          : <span className="pf-avatar-blank" aria-hidden="true">
              {(name || profile.handle || '?')[0].toUpperCase()}
            </span>}
        <div className="pf-avatar-do">
          <label className="pf-upload">
            Change picture
            <input
              type="file" accept="image/png,image/jpeg,image/webp"
              onChange={async e => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (!f) return
                setError('')
                try { setImage(await squareToDataUrl(f)) } catch (err) { setError(err.message) }
              }}
            />
          </label>
          {image && (
            <button type="button" className="pf-clear" onClick={() => setImage(null)}>Remove</button>
          )}
          <span className="pf-help">Square, and shrunk to {AVATAR}px before it is saved.</span>
        </div>
      </div>

      <label className="pf-field">
        <span className="pf-label">Display name</span>
        <input value={name} onChange={e => setName(e.target.value)} maxLength={60}
          placeholder="What people call you" />
      </label>

      <label className="pf-field">
        <span className="pf-label">Handle</span>
        <span className="pf-handle">
          <i aria-hidden="true">/u/</i>
          <input
            value={handle}
            onChange={e => setHandle(slugify(e.target.value))}
            maxLength={HANDLE_MAX}
            spellCheck={false}
            autoCapitalize="none"
            aria-describedby="handle-help"
          />
        </span>
        <span className="pf-help" id="handle-help">
          This is your address on the site. Lowercase letters, numbers and underscores.
          Changing it breaks any link you have already shared.
        </span>
      </label>

      <label className="pf-field">
        <span className="pf-label">Bio</span>
        <textarea value={bio} onChange={e => setBio(e.target.value.slice(0, BIO_MAX))} rows={3}
          placeholder="What you listen to, and how you score it." />
        <span className="pf-help">{BIO_MAX - bio.length} characters left</span>
      </label>

      <div className="pf-actions">
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Saving' : 'Save profile'}
        </button>
        {saved && <span className="pf-saved">Saved.</span>}
        {profile.handle && (
          <a className="btn-ghost" href={`/u/${profile.handle}`}>View your public page</a>
        )}
      </div>

      {error && <p className="notice notice-bad">{error}</p>}
    </form>
  )
}
