let token = localStorage.getItem('token') || null

export function setToken (t) {
  token = t
  if (t) localStorage.setItem('token', t)
  else localStorage.removeItem('token')
}

export function hasToken () { return !!token }

async function req (method, url, body) {
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  })
  if (res.status === 401 && !url.endsWith('/login')) {
    setToken(null)
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

export const api = {
  login: pw => req('POST', '/api/login', { password: pw }),
  search: (q, source = 'all') => req('GET', `/api/search?q=${encodeURIComponent(q)}&source=${source}`),
  album: id => req('GET', `/api/album/${id}`),
  reviews: () => req('GET', '/api/reviews'),
  review: id => req('GET', `/api/reviews/${id}`),
  saveReview: (id, data) => req('PUT', `/api/reviews/${id}`, data),
  deleteReview: id => req('DELETE', `/api/reviews/${id}`),
  exportData: id => req('GET', `/api/export/${id}`),
  tiers: () => req('GET', '/api/tiers'),
  saveTiers: labels => req('PUT', '/api/tiers', labels),

  discography: () => req('GET', '/api/discography'),
  artistDiscography: name => req('GET', `/api/discography/${encodeURIComponent(name)}`),
  saveDiscographyEntry: (id, data) => req('PUT', `/api/discography/${encodeURIComponent(id)}`, data),
  deleteDiscographyEntry: id => req('DELETE', `/api/discography/${encodeURIComponent(id)}`),

  snapshots: () => req('GET', '/api/snapshots'),
  createSnapshot: label => req('POST', '/api/snapshots', { label }),
  deleteSnapshot: id => req('DELETE', `/api/snapshots/${encodeURIComponent(id)}`),
  updateNotes: () => req('GET', '/api/update-notes'),
  saveUpdateNotes: notes => req('PUT', '/api/update-notes', { notes }),
  leaderboardUpdate: snapshot =>
    req('GET', `/api/leaderboard-update${snapshot ? `?snapshot=${encodeURIComponent(snapshot)}` : ''}`)
}

export const proxyImg = url => {
  if (!url) return ''
  if (url.startsWith('data:')) return url // custom uploaded covers
  return `/api/img?url=${encodeURIComponent(url)}`
}
