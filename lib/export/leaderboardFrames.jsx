'use client'

import React from 'react'
import { fmtScore } from '../rating-scale.js'
import { FrameShell, Surface, ScoreChip, FitText, Fill, rowRule } from './shell.jsx'
import { Cover } from './frames.jsx'

const UP = '#34d399'
const DOWN = '#fb7185'
const FLAT = 'rgba(var(--ink-rgb), 0.4)'

// "▲ 6", "▼ 2", ", " or "NEW", one column, always the same width, so the rows
// stay in a clean vertical rhythm no matter how far anything moved.
function Delta ({ places, isNew, accent }) {
  if (isNew) {
    return (
      <span style={{
        fontSize: 20, fontWeight: 800, letterSpacing: 1.5, color: accent,
        border: `2px solid ${accent}`, borderRadius: 8, padding: '3px 9px'
      }}>NEW</span>
    )
  }
  if (places === null || places === undefined) return <span style={{ color: FLAT, fontSize: 26 }}>·</span>
  if (places === 0) return <span style={{ color: FLAT, fontSize: 30, fontWeight: 700 }}>-</span>
  const up = places > 0
  return (
    <span style={{
      fontSize: 28, fontWeight: 800, color: up ? UP : DOWN,
      fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap'
    }}>
      {up ? '▲' : '▼'} {Math.abs(places)}
    </span>
  )
}

function RatingDelta ({ delta }) {
  // No snapshot means there is nothing to compare against, so the column stays
  // empty rather than claiming every score held steady.
  if (delta === null || delta === undefined) return null
  if (typeof delta !== 'number' || Math.abs(delta) < 0.05) {
    return <span style={{ fontSize: 21, fontWeight: 700, color: FLAT, fontVariantNumeric: 'tabular-nums' }}>±0.0</span>
  }
  return (
    <span style={{
      fontSize: 21, fontWeight: 800, color: delta > 0 ? UP : DOWN,
      fontVariantNumeric: 'tabular-nums'
    }}>
      {delta > 0 ? '+' : '−'}{Math.abs(delta).toFixed(1)}
    </span>
  )
}

// ---------- The update announcement ----------
export function UpdateIntroFrame ({ notes, offset, page, pages, palette, theme }) {
  return (
    <FrameShell palette={palette} theme={theme}>
      <div style={{ marginBottom: 46 }}>
        <div style={{ fontSize: 30, fontWeight: 'var(--label-weight)', letterSpacing: 'var(--label-track)', textTransform: 'var(--label-case)', color: palette.accent }}>
          System Update{pages > 1 ? ` · ${page} / ${pages}` : ''}
        </div>
        <div style={{ fontSize: 86, fontWeight: 800, letterSpacing: -2.5, marginTop: 12, lineHeight: 1.05 }}>
          What&rsquo;s Changed
        </div>
        <div style={{ fontSize: 30, fontWeight: 600, color: 'rgba(var(--ink-rgb), 0.6)', marginTop: 16, lineHeight: 1.35 }}>
          How every album on the leaderboard is scored, rewritten.
        </div>
      </div>

      <Fill theme={theme} gap={24}>
        {notes.map((note, i) => (
          <Surface key={i} theme={theme} radius={32} style={{ padding: '30px 34px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 20 }}>
              <span style={{
                fontSize: 46, fontWeight: 800, color: palette.accent,
                fontVariantNumeric: 'tabular-nums', minWidth: 68, flexShrink: 0
              }}>
                {String(offset + i + 1).padStart(2, '0')}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <FitText size={42} min={28} lines={2} weight={800} fitKey={note.title} style={{ letterSpacing: -0.8 }}>
                  {note.title}
                </FitText>
                <div style={{ fontSize: 27, fontWeight: 500, lineHeight: 1.38, color: 'rgba(var(--ink-rgb), 0.78)', marginTop: 10 }}>
                  {note.body}
                </div>
              </div>
            </div>
          </Surface>
        ))}
      </Fill>
    </FrameShell>
  )
}

// ---------- The leaderboard title card ----------
export function LeaderboardTitleFrame ({ total, top, palette, theme }) {
  return (
    <FrameShell palette={palette} theme={theme}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ fontSize: 32, fontWeight: 'var(--label-weight)', letterSpacing: 'var(--label-track)', textTransform: 'var(--label-case)', color: palette.accent }}>
          After the update
        </div>
        <div style={{ fontSize: 108, fontWeight: 800, letterSpacing: -3.5, marginTop: 16, lineHeight: 1.02 }}>
          The Full<br />Leaderboard
        </div>
        <div style={{ fontSize: 36, fontWeight: 600, color: 'rgba(var(--ink-rgb), 0.6)', marginTop: 22 }}>
          All {total} albums, re-scored
        </div>

        {top.length > 0 && (
          <div style={{ display: 'flex', gap: 22, marginTop: 66, alignItems: 'flex-end' }}>
            {top.map((r, i) => (
              <div key={r.albumId} style={{ textAlign: 'center' }}>
                <Cover
                  src={r.coverProxied} size={i === 0 ? 250 : 200}
                  style={{ borderRadius: 24, boxShadow: '0 26px 60px rgba(0,0,0,0.6)' }}
                />
                <div style={{ fontSize: 30, fontWeight: 800, color: palette.accent, marginTop: 12 }}>#{r.rank}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </FrameShell>
  )
}

// ---------- The leaderboard itself ----------
export function LeaderboardFrame ({ rows, from, to, total, palette, theme }) {
  return (
    <FrameShell palette={palette} theme={theme}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 26 }}>
        <div style={{ fontSize: 30, fontWeight: 'var(--label-weight)', letterSpacing: 'var(--label-track)', textTransform: 'var(--label-case)', color: palette.accent }}>
          Leaderboard
        </div>
        <div style={{ fontSize: 27, fontWeight: 700, color: 'rgba(var(--ink-rgb), 0.55)', fontVariantNumeric: 'tabular-nums' }}>
          {from}–{to} of {total}
        </div>
      </div>

      <Fill theme={theme}>
        <Surface theme={theme} radius={30} style={{ padding: '10px 24px', flexShrink: 0 }}>
          {rows.map((r, i) => (
            <div key={r.albumId} style={{
              display: 'flex', alignItems: 'center', gap: 15, height: 94,
              borderBottom: i < rows.length - 1 ? rowRule(theme) : 'none'
            }}>
              <span style={{
                width: 76, flexShrink: 0, textAlign: 'center',
                fontSize: 34, fontWeight: 800, color: 'rgba(var(--ink-rgb), 0.85)',
                fontVariantNumeric: 'tabular-nums'
              }}>
                {r.rank}
              </span>
              <span style={{ width: 86, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                <Delta places={r.rankDelta} isNew={r.isNew} accent={palette.accent} />
              </span>
              <Cover src={r.coverProxied} size={66} style={{ borderRadius: 13 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* the name column is narrow here, so long titles wrap onto a
                    second line rather than shrinking away to nothing */}
                <FitText size={26} min={16} lines={2} boxHeight={62} weight={700} fitKey={r.album.name}>
                  {r.album.name}
                </FitText>
                <FitText
                  size={20} min={14} weight={500} fitKey={r.album.artists.join(', ')}
                  style={{ color: 'rgba(var(--ink-rgb), 0.55)' }}
                >
                  {r.album.artists.join(', ')}
                </FitText>
              </div>
              <div style={{ width: 70, textAlign: 'right', flexShrink: 0 }}>
                <RatingDelta delta={r.ratingDelta} />
              </div>
              <ScoreChip score={r.rating} theme={theme} size={50} fontSize={27} decimals={1} minWidth={94} />
            </div>
          ))}
        </Surface>
      </Fill>
    </FrameShell>
  )
}

// ---------- Biggest song movements ----------
// The compact leaderboard has no room for per-album song detail, so the most
// notable re-rates are collected onto their own card at the end.
export function SongJumpsFrame ({ jumps, page, pages, palette, theme }) {
  return (
    <FrameShell palette={palette} theme={theme}>
      <div style={{ marginBottom: 38 }}>
        <div style={{ fontSize: 30, fontWeight: 'var(--label-weight)', letterSpacing: 'var(--label-track)', textTransform: 'var(--label-case)', color: palette.accent }}>
          Re-rated{pages > 1 ? ` · ${page} / ${pages}` : ''}
        </div>
        <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: -2.5, marginTop: 10, lineHeight: 1.05 }}>
          Biggest Song<br />Jumps
        </div>
      </div>

      <Fill theme={theme}>
        <Surface theme={theme} radius={30} style={{ padding: '10px 30px', flexShrink: 0 }}>
          {jumps.map((j, i) => (
            <div key={`${j.albumId}:${j.name}`} style={{
              display: 'flex', alignItems: 'center', gap: 20, height: 104,
              borderBottom: i < jumps.length - 1 ? rowRule(theme) : 'none'
            }}>
              <Cover src={j.coverProxied} size={70} style={{ borderRadius: 14 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <FitText size={30} min={18} lines={2} boxHeight={70} weight={700} fitKey={j.name}>{j.name}</FitText>
                <FitText
                  size={21} min={15} weight={500} fitKey={j.albumName}
                  style={{ color: 'rgba(var(--ink-rgb), 0.55)' }}
                >
                  {j.albumName}
                </FitText>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                <ScoreChip score={j.from} theme={theme} size={48} fontSize={25} />
                <span style={{ fontSize: 30, fontWeight: 800, color: 'rgba(var(--ink-rgb), 0.45)' }}>→</span>
                <ScoreChip score={j.to} theme={theme} size={56} fontSize={30} />
              </div>
            </div>
          ))}
        </Surface>
      </Fill>
    </FrameShell>
  )
}

// ---------- Movement highlights (used on the intro when a diff exists) ----------
export function MoversFrame ({ climbers, fallers, palette, theme }) {
  const Col = ({ title, tone, rows }) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 24, fontWeight: 'var(--label-weight)', letterSpacing: 'var(--label-track)', textTransform: 'var(--label-case)', color: tone, marginBottom: 14 }}>
        {title}
      </div>
      <Surface theme={theme} radius={26} style={{ padding: '8px 20px' }}>
        {rows.map((r, i) => (
          <div key={r.albumId} style={{
            display: 'flex', alignItems: 'center', gap: 14, height: 82,
            borderBottom: i < rows.length - 1 ? rowRule(theme) : 'none'
          }}>
            <Cover src={r.coverProxied} size={56} style={{ borderRadius: 11 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <FitText size={23} min={15} weight={700} fitKey={r.album.name}>{r.album.name}</FitText>
              <div style={{ fontSize: 18, fontWeight: 600, color: 'rgba(var(--ink-rgb), 0.5)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                #{r.prevRank} → #{r.rank} · {fmtScore(r.rating)}
              </div>
            </div>
            <span style={{ fontSize: 26, fontWeight: 800, color: tone, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
              {r.rankDelta > 0 ? '▲' : '▼'} {Math.abs(r.rankDelta)}
            </span>
          </div>
        ))}
      </Surface>
    </div>
  )

  return (
    <FrameShell palette={palette} theme={theme}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 30, fontWeight: 'var(--label-weight)', letterSpacing: 'var(--label-track)', textTransform: 'var(--label-case)', color: palette.accent }}>
          The Shake-Up
        </div>
        <div style={{ fontSize: 78, fontWeight: 800, letterSpacing: -2.5, marginTop: 10 }}>
          Who Moved Most
        </div>
      </div>
      <Fill theme={theme} gap={34}>
        <Col title="Biggest climbers" tone={UP} rows={climbers} />
        <Col title="Biggest falls" tone={DOWN} rows={fallers} />
      </Fill>
    </FrameShell>
  )
}
