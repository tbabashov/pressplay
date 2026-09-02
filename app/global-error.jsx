'use client'

// The last resort: this replaces the whole document, so it cannot rely on the
// layout, on the stylesheet, or on anything the app normally provides. Every
// style here is inline for that reason.
export default function GlobalError ({ error, reset }) {
  return (
    <html lang="en">
      <body style={{
        margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center',
        background: '#08080b', color: '#f5f5f7',
        fontFamily: 'system-ui, -apple-system, sans-serif', padding: '24px'
      }}>
        <div style={{ maxWidth: 460 }}>
          <p style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: '#e2aa4a', margin: '0 0 12px' }}>Something broke</p>
          <h1 style={{ fontSize: 30, lineHeight: 1.1, letterSpacing: '-0.03em', margin: 0 }}>
            Press Play could not start.
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: '#a8a8b0', marginTop: 14 }}>
            Reloading usually fixes it. If it does not, the reference below identifies what went
            wrong.
          </p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: 20, padding: '11px 20px', borderRadius: 10, border: 0, cursor: 'pointer',
              font: 'inherit', fontSize: 14, fontWeight: 600, color: '#17140c', background: '#e2aa4a'
            }}
          >Reload</button>
          {error?.digest && (
            <p style={{ marginTop: 18, fontSize: 12.5, color: '#6f6f78' }}>
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
