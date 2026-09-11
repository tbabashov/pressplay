import Link from 'next/link'
import Shuffle from './Shuffle'

// What to rate next, under the search box.
//
// An album from the catalogue links straight into rating it. One from the wall
// has no album id, only a preview id, so it links to a search for its name:
// pressing it still lands on the record, it just goes through the catalogue on
// the way. That is why the two carry different links rather than one shape.
export default function Suggestions ({ kind, items }) {
  if (!items?.length) return null

  return (
    <section className="sg">
      <div className="sg-head">
        <div className="sg-head-row">
          <h2>{kind === 'popular' ? 'Somewhere to start' : 'Rate next'}</h2>
          <Shuffle />
        </div>
      </div>

      <ul className="sg-list">
        {items.map(a => (
          <li key={a.id || a.query}>
            <Link
              href={a.id
                ? `/app/rate/${encodeURIComponent(a.id)}`
                : `/app?q=${encodeURIComponent(a.query)}`}
              className="sg-card"
            >
              {a.cover
                ? <img src={a.cover} alt="" loading="lazy" width="132" height="132" />
                : <span className="sg-blank" aria-hidden="true" />}
              <strong>{a.name}</strong>
              <em>{a.artist}</em>
              {/* Only when it says something this card does not share with the
                  eleven beside it. On the popular strip the reason is the same
                  for all of them, so it would be the same line twelve times. */}
              {kind !== 'popular' && a.reason && <span className="sg-why">{a.reason}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
