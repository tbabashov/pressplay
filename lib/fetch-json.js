// A response is not always JSON, however well behaved the route is. A platform
// can reject a request before it reaches the handler, a body over the size
// limit, a function that timed out, a gateway error, and what comes back is
// empty or HTML. Calling .json() on that throws "Unexpected end of JSON input",
// which is what a user then sees instead of what actually went wrong.
export async function fetchJson (url, init) {
  let res
  try {
    res = await fetch(url, init)
  } catch {
    throw new Error('No answer from the server. Check your connection and try again.')
  }

  const text = await res.text().catch(() => '')
  let data = null
  if (text) { try { data = JSON.parse(text) } catch { /* not JSON */ } }

  if (!res.ok) {
    const err = new Error(
      data?.error ||
      (res.status === 413 ? 'That was too large to upload.' : null) ||
      (res.status >= 500 ? 'The server had a problem with that. Try again in a moment.' : null) ||
      `That did not save (${res.status}).`)
    err.status = res.status
    err.field = data?.field
    throw err
  }

  if (data === null) throw new Error('The server sent something unreadable back.')
  return data
}
