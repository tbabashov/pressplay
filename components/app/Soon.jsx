// Honest empty states for sections that exist in the rail but not yet in the
// product. Better than a dead link or a 404 that reads as a bug.
export default function Soon ({ title, body }) {
  return (
    <>
      <div className="page-head"><h1>{title}</h1></div>
      <div className="soon-panel">
        <p>{body}</p>
        <a className="btn-ghost" href="/app">Rate something instead</a>
      </div>
    </>
  )
}
