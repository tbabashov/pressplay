import { GROUPS, earnedCount } from '@/lib/achievements'

// A locked badge still shows how far along it is. "18 of 25" is something to
// finish; a blank locked badge is only a reminder that you have not.
// bare drops the section's own heading, for a page that already gave it one.
export default function Achievements ({ list, bare }) {
  if (!list?.length) return null
  const done = earnedCount(list)

  return (
    <section className="ts-block ac">
      {bare
        ? <p className="ac-tally">{done} of {list.length} earned</p>
        : (
          <h2 className="ts-h2">
            Achievements
            <em className="ac-count tnum">{done} of {list.length}</em>
          </h2>
        )}

      {GROUPS.map(([group, label]) => {
        const rows = list.filter(a => a.group === group)
        if (!rows.length) return null
        return (
          <div className="ac-group" key={group}>
            <h3>{label}</h3>
            <ul className="ac-grid">
              {rows.map(a => (
                <li key={a.key} className={`ac-badge${a.earned ? ' on' : ''}`}>
                  <span className="ac-mark" aria-hidden="true">
                    {a.earned ? (
                      <svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none"
                        stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"
                        strokeLinejoin="round" /></svg>
                    ) : (
                      <svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"
                        fill="none" stroke="currentColor" strokeWidth="1.9" /><path d="M8 11V8a4 4 0 0 1 8 0v3"
                        fill="none" stroke="currentColor" strokeWidth="1.9" /></svg>
                    )}
                  </span>
                  <span className="ac-id">
                    <strong>{a.name}</strong>
                    <em>{a.about}</em>
                  </span>
                  {a.earned
                    ? <span className="ac-state">Earned</span>
                    : (
                      <span className="ac-state ac-progress">
                        <span className="ac-bar"><i style={{ width: `${a.percent}%` }} /></span>
                        <b className="tnum">{a.have} of {a.need}</b>
                      </span>
                    )}
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </section>
  )
}
