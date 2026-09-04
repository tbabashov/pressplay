'use client'

import { useState } from 'react'
import { usePlayer } from './audio/Player'
import { chipColour, ratingColor } from '../lib/rating-colors'
import wall from '../lib/wall.json'

// A published review with the argument attached. Written by nobody: this is a
// worked example of what a review page will look like, not real user content.
const ALBUM = wall.find(a => a.name === 'Random Access Memories') || wall[0]

const REVIEW = {
  by: 'marguerite',
  when: '3 days ago',
  score: 8.4,
  verdict:
    'The playing is immaculate and the drums sound better than anything else released that year. ' +
    'It is also twenty minutes too long and it knows it. Docking it for the stretch between Touch and ' +
    'Motherboard, which I have skipped every single time.',
  // Lyricism was missing, which left the example showing five parts where the
  // rater asks for six. The six average to the 8.4 on the card — a worked
  // example that does not add up is the thing it is meant to be teaching.
  criteria: [['Song average', 8.4], ['Lyricism', 8], ['Production', 11], ['Delivery', 8], ['Album experience', 7], ['Replay value', 8]],
  best: 'Giorgio by Moroder',
  worst: 'Motherboard'
}

const COMMENTS = [
  { by: 'devonh', when: '2d', votes: 34, mine: 0,
    text: 'Production 11 is the only correct take on this page. That snare is a public service.' },
  { by: 'ninaonline', when: '2d', votes: 18, mine: 0,
    text: 'Skipping Motherboard is a choice and I respect it, but Touch is the whole point of the record. ' +
          'Album experience 7 undersells the back half.',
    replies: [
      { by: 'marguerite', when: '1d', votes: 11, mine: 0, op: true,
        text: 'Fair. I have gone back and forth on Touch more than anything else here.' }
    ] },
  { by: 'okcomputerfan', when: '1d', votes: -6, mine: 0,
    text: 'An 8.4 for this is generous. Half of it is session musicians doing very expensive karaoke.' }
]

function Votes ({ start, id, state, setState }) {
  const mine = state[id] ?? 0
  const total = start + mine
  const cast = v => setState(s => ({ ...s, [id]: s[id] === v ? 0 : v }))
  return (
    <span className="votes">
      <button className={mine === 1 ? 'on' : ''} onClick={() => cast(1)} aria-label="Upvote" aria-pressed={mine === 1}>
        <svg viewBox="0 0 24 24"><path d="M12 5.5 20 15H4z" /></svg>
      </button>
      <b className={`tnum${total < 0 ? ' neg' : ''}`}>{total}</b>
      <button className={mine === -1 ? 'on' : ''} onClick={() => cast(-1)} aria-label="Downvote" aria-pressed={mine === -1}>
        <svg viewBox="0 0 24 24"><path d="M12 18.5 4 9h16z" /></svg>
      </button>
    </span>
  )
}

export default function ReviewDemo () {
  const { track, playing, play } = usePlayer()
  const [votes, setVotes] = useState({})
  const on = track?.dz === ALBUM.dz
  const c = ratingColor(REVIEW.score)

  return (
    <div className="rev">
      <article className="rev-card">
        <div className="rev-top">
          <button
            className="rev-art"
            onClick={() => play(ALBUM)}
            aria-label={on && playing ? `Pause ${ALBUM.name}` : `Play a preview of ${ALBUM.name}`}
          >
            <img src={ALBUM.cover} alt="" />
            <span className="rev-art-glyph" aria-hidden="true">
              {on && playing
                ? <svg viewBox="0 0 24 24"><rect x="7" y="5.5" width="3.4" height="13" rx="1.2" /><rect x="13.6" y="5.5" width="3.4" height="13" rx="1.2" /></svg>
                : <svg viewBox="0 0 24 24"><path d="M8.5 5.6v12.8a.8.8 0 0 0 1.22.68l10.1-6.4a.8.8 0 0 0 0-1.36L9.72 4.92a.8.8 0 0 0-1.22.68Z" /></svg>}
            </span>
          </button>

          <div className="rev-id">
            <strong>{ALBUM.name}</strong>
            <span>{ALBUM.artist}</span>
            <p className="rev-who">
              <i aria-hidden="true">{REVIEW.by[0].toUpperCase()}</i>
              {REVIEW.by} · {REVIEW.when}
            </p>
          </div>

          <span className="rev-score" style={{ background: c.bg, color: c.fg }}>{REVIEW.score}</span>
        </div>

        <p className="rev-verdict">{REVIEW.verdict}</p>

        <dl className="rev-crit">
          {REVIEW.criteria.map(([label, v]) => {
            const col = chipColour(v)
            return (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  <span className="rev-crit-chip tnum" style={{ background: col.bg, color: col.fg }}>{v}</span>
                </dd>
              </div>
            )
          })}
        </dl>

        <p className="rev-picks">
          <span>Best <b>{REVIEW.best}</b></span>
          <span>Worst <b>{REVIEW.worst}</b></span>
        </p>
      </article>

      <div className="rev-thread">
        <h3 className="rev-thread-head">{COMMENTS.length + 1} replies</h3>
        <ul>
          {COMMENTS.map((cm, i) => (
            <li key={cm.by}>
              <div className="cmt">
                <i className="cmt-pfp" aria-hidden="true">{cm.by[0].toUpperCase()}</i>
                <div>
                  <p className="cmt-by">{cm.by}<em>{cm.when}</em></p>
                  <p className="cmt-text">{cm.text}</p>
                  <Votes start={cm.votes} id={`c${i}`} state={votes} setState={setVotes} />
                </div>
              </div>
              {cm.replies?.map((rp, j) => (
                <div className="cmt cmt-reply" key={rp.by}>
                  <i className="cmt-pfp" aria-hidden="true">{rp.by[0].toUpperCase()}</i>
                  <div>
                    <p className="cmt-by">{rp.by}{rp.op && <b className="cmt-op">author</b>}<em>{rp.when}</em></p>
                    <p className="cmt-text">{rp.text}</p>
                    <Votes start={rp.votes} id={`r${i}${j}`} state={votes} setState={setVotes} />
                  </div>
                </div>
              ))}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
