'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AlbumBuilder from './AlbumBuilder'

// The suggestions come in as children rather than as a sibling, so this can
// decide whether they belong on screen. They are still built on the server —
// children arrive already rendered — so nothing about that moves to the client.
export default function Search ({ children }) {
  // A suggestion for a record the wall knows by name rather than by catalogue
  // id links here with the name in the query string. Reading it means those
  // cards land on results instead of an empty box, and it makes any search
  // shareable as a link.
  const params = useSearchParams()
  const [q, setQ] = useState(() => params.get('q') || '')
  const urlQ = params.get('q') || ''
  const [results, setResults] = useState([])
  const [state, setState] = useState('idle')   // idle | loading | done | error
  const [error, setError] = useState('')
  const box = useRef(null)
  const [building, setBuilding] = useState(false)
  const router = useRouter()

  // Focus only when there is nothing to read yet. Arriving with a query and
  // having the page jump to a focused box hides the results behind a keyboard
  // on a phone.
  useEffect(() => { if (!params.get('q')) box.current?.focus() }, [params])

  // The query string has to be read again on every navigation, not only on
  // mount. A suggestion for a record the wall knows by name links to this same
  // route, so pressing one is a client side navigation that never unmounts
  // this component, and the initialiser above runs once and never again.
  //
  // That is what made a suggestion look broken. The URL gained the name, the
  // server sent a fresh set of suggestions because it reseeds on every render,
  // and the box stayed empty, so the only thing anybody saw happen was the
  // cards reshuffling. It only ever hit a new account: once there are ratings
  // the suggestions carry catalogue ids and link to /app/rate/<id>, which is a
  // different route and does unmount this.
  //
  // Only ever sets from a query that exists. Typing never writes to the URL, so
  // clearing on an empty one would wipe what somebody is in the middle of.
  useEffect(() => { if (urlQ) setQ(urlQ) }, [urlQ])

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
      <AlbumBuilder open={building} onClose={() => setBuilding(false)} initialName={q.trim()} />
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

      <div className="search-make">
        <button onClick={() => setBuilding(true)}>Cannot find it? Add the album yourself</button>
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
          Nothing came back for that. Try the artist name, or fewer words.{' '}
          <button onClick={() => setBuilding(true)}>Add it yourself</button>
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

      {/* A single letter is not a search yet and the suggestions have already
          stood down, so say what the page is waiting for rather than leaving it
          blank between the box and the bottom. */}
      {state === 'idle' && q.trim().length === 1 && (
        <p className="notice">One more letter and the search starts.</p>
      )}

      {/* Only with nothing typed. Two grids of covers, one answering the query
          and one ignoring it, look identical and read as more results — so the
          suggestions stand down the moment there is something to search for,
          and come back the moment the box is empty again. Keyed on the box
          rather than on results arriving, or they would linger under a query
          for the length of the debounce and then vanish. */}
      {q.trim().length === 0 && children}
    </div>
  )
}
