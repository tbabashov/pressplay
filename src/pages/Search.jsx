import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, proxyImg, setToken } from '../api.js'
import { ratingColor } from '../colors.js'

export default function Search () {
  const [q, setQ] = useState('')
  const [source, setSource] = useState('all')
  const [results, setResults] = useState([])
  const [rated, setRated] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const nav = useNavigate()
  const timer = useRef(null)

  useEffect(() => {
    api.reviews().then(d => setRated(d.reviews)).catch(() => {})
  }, [])

  useEffect(() => {
    clearTimeout(timer.current)
    if (!q.trim()) { setResults([]); setErr(''); return }
    timer.current = setTimeout(async () => {
      setLoading(true)
      setErr('')
      try {
        const d = await api.search(q, source)
        setResults(d.albums)
      } catch (e) {
        setErr(e.message)
      } finally {
        setLoading(false)
      }
    }, 350)
    return () => clearTimeout(timer.current)
  }, [q, source])

  return (
    <div className="app">
      <div className="nav">
        <h1>Album Rankings</h1>
        <div className="links">
          <button className="pill" onClick={() => nav('/discography')}>Discographies</button>
          <button className="pill" onClick={() => nav('/update')}>Update Video</button>
          <button className="pill" onClick={() => nav('/create')}>+ Manual Album</button>
          <button className="pill" onClick={() => { setToken(null); nav('/login') }}>Sign Out</button>
        </div>
      </div>

      <div className="search-wrap">
        <span className="search-icon">🔍</span>
        <input
          className="search-input" value={q} autoFocus
          placeholder="Search albums or artists"
          onChange={e => setQ(e.target.value)}
        />
      </div>

      {q && (
        <div className="source-tabs">
          {[['all', 'All'], ['itunes', 'iTunes'], ['discogs', 'Discogs']].map(([val, label]) => (
            <button
              key={val}
              className={`source-tab${source === val ? ' active' : ''}`}
              onClick={() => setSource(val)}
            >{label}</button>
          ))}
        </div>
      )}

      {err && <div className="muted">{err}</div>}
      {loading && <span className="spin" />}

      {!loading && results.length > 0 && (
        <div className="card">
          {results.map(a => (
            <div key={a.id} className="album-row" onClick={() => nav(`/rate/${a.id}`)}>
              <img src={proxyImg(a.coverSmall || a.cover)} alt="" />
              <div className="meta">
                <div className="title">{a.name}</div>
                <div className="sub">
                  {[a.artists.join(', '), a.releaseDate?.slice(0, 4), a.totalTracks && `${a.totalTracks} tracks`].filter(Boolean).join(' · ')}
                  <span className="src-badge">{a.id.startsWith('dg:') ? 'Discogs' : /^\d+$/.test(a.id) ? 'iTunes' : 'Spotify'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!q && rated.length > 0 && (
        <>
          <div className="section-title">My Rankings</div>
          <div className="card">
            {rated.map(r => {
              const c = ratingColor(r.average != null ? Math.round(r.average) : null)
              return (
                <div key={r.albumId} className="album-row" onClick={() => nav(r.average != null ? `/export/${r.albumId}` : `/rate/${r.albumId}`)}>
                  <div style={{ width: 28, textAlign: 'center', color: 'var(--text-3)', fontWeight: 700 }}>{r.rank ?? '·'}</div>
                  <img src={proxyImg(r.album.coverSmall || r.album.cover)} alt="" />
                  <div className="meta">
                    <div className="title">{r.album.name}</div>
                    <div className="sub">{r.album.artists.join(', ')} · {r.album.year}</div>
                  </div>
                  <span className="score-chip" style={{ background: c.bg, color: c.fg }}>
                    {r.average != null ? r.average.toFixed(1) : '—'}
                  </span>
                  <button
                    className="pill"
                    style={{ padding: '6px 12px', fontSize: 13 }}
                    onClick={e => { e.stopPropagation(); nav(`/rate/${r.albumId}`) }}
                  >Edit</button>
                  <button
                    className="row-delete" title="Delete this album from your history"
                    onClick={async e => {
                      e.stopPropagation()
                      if (!window.confirm(`Delete "${r.album.name}" and its ratings? This can't be undone.`)) return
                      try {
                        await api.deleteReview(r.albumId)
                        const d = await api.reviews()
                        setRated(d.reviews)
                      } catch (err) { setErr(err.message) }
                    }}
                  >✕</button>
                </div>
              )
            })}
          </div>
        </>
      )}

      {!q && rated.length === 0 && !err && (
        <div className="muted">Search for an album to start rating.</div>
      )}
    </div>
  )
}
