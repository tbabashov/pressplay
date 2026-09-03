import Link from 'next/link'

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
        <h2>{kind === 'popular' ? 'Somewhere to start' : 'Rate next'}</h2>
        <p>
          {kind === 'popular'
            ? 'Records most people already have an opinion about.'
            : 'Built from what you have rated and who sits next to them.'}
        </p>
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
                  for all of them and the heading has already given it. */}
              {kind !== 'popular' && a.reason && <span className="sg-why">{a.reason}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
