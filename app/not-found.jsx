import Link from 'next/link'

export const metadata = { title: 'Not found' }

export default function NotFound () {
  return (
    <div className="errpage">
      <div className="errpage-body">
        <p className="errpage-kicker">404</p>
        <h1 className="display">There is nothing here.</h1>
        <p>
          The page has moved, or the link was wrong, or a review that used to be public is not
          any more. None of those are worth staring at.
        </p>
        <div className="errpage-do">
          <Link className="btn-primary" href="/">Back to the front</Link>
          <Link className="btn-ghost" href="/browse">Browse raters</Link>
        </div>
      </div>
    </div>
  )
}
