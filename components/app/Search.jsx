'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Search () {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [state, setState] = useState('idle')   // idle | loading | done | error
  const [error, setError] = useState('')
  const box = useRef(null)
  const router = useRouter()

  useEffect(() => { box.current?.focus() }, [])

  // Debounced so a fast typist makes one request, not eight.
  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) { setResults([]); setState('idle'); return }
    setState('loading')
    const ac = new AbortController()
    const t = setTimeout(async () => {
      try {
        // no-store on the request as well as the response: a cache entry that
        // is already poisoned is only bypassed by asking not to use the cache.
        const r = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
          signal: ac.signal, cache: 'no-store'
        })
        const body = await r.json()
        if (!r.ok) throw new Error(body.error || 'Search failed.')
        setResults(body.results)
        setState('done')
      } catch (e) {
        if (e.name === 'AbortError') return
        setError(e.message)
        setState('error')
      }
    }, 260)
    return () => { clearTimeout(t); ac.abort() }
  }, [q])

  return (
    <div className="search">
      <div className="search-field">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="search-icon">
          <circle cx="10.5" cy="10.5" r="6.4" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="m15.4 15.4 4.2 4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          ref={box}
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search an album or an artist"
          aria-label="Search an album or an artist"
          autoComplete="off"
          spellCheck="false"
        />
        {q && (
          <button className="search-clear" onClick={() => { setQ(''); box.current?.focus() }} aria-label="Clear search">
            <svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11m0-11l-11 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        )}
      </div>

      {state === 'error' && (
        <p className="notice notice-bad">
          {error} <button onClick={() => setQ(q + ' ')}>Try again</button>
        </p>
      )}

      {state === 'loading' && (
        <ul className="grid" aria-label="Loading results">
          {Array.from({ length: 12 }, (_, i) => (
            <li key={i}><span className="tile"><span className="tile-shot"><span className="tile-art tile-ghost" /></span></span></li>
          ))}
        </ul>
      )}

      {state === 'done' && results.length === 0 && (
        <p className="notice">
          Nothing came back for that. Try the artist name, or fewer words.
        </p>
      )}

      {state === 'done' && results.length > 0 && (
        <ul className="grid">
          {results.map(a => (
            <li key={a.id}>
              <button className="tile" onClick={() => router.push(`/app/rate/${encodeURIComponent(a.id)}`)}>
                <span className="tile-shot">
                  <span className="tile-art">
                    {a.cover
                      ? <img src={a.cover} alt="" loading="lazy" />
                      : <span className="tile-blank" aria-hidden="true" />}
                  </span>
                </span>
                <strong>{a.name}</strong>
                <span className="tile-sub">{a.artist}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {state === 'idle' && q.trim().length === 0 && (
        <div className="empty">
          <p>Start typing and the catalogue comes to you, with the real tracklist and a
             preview of every song.</p>
        </div>
      )}
    </div>
  )
}
