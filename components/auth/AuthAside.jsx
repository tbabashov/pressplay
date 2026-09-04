import wall from '@/lib/wall.json'

// The cover grid beside every account screen: signing in, asking for a reset
// link, and setting a new one. One component rather than three copies, because
// they are the same room and somebody following a link out of their email
// should not arrive somewhere that looks like a different site.
//
// Real covers, never decorative stock, and a fixed slice so the server and the
// browser build the same grid.
export default function AuthAside ({
  line = 'An average is not an opinion.',
  under = 'Every song scored. Your criteria, your scale. One number you can defend.'
}) {
  const covers = wall.slice(0, 24)

  return (
    <aside className="jn-right" aria-hidden="true">
      <div className="jn-grid">
        {covers.map(a => (
          <img key={a.cover} src={a.cover} alt="" width="150" height="150" loading="lazy" />
        ))}
      </div>
      <div className="jn-veil" />
      <blockquote className="jn-quote">
        <p className="display">{line}</p>
        <cite>{under}</cite>
      </blockquote>
    </aside>
  )
}
