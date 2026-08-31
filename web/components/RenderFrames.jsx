'use client'

import { useEffect, useState } from 'react'
import { extractPalette, fallbackPalette } from '@/lib/rating-colors'
import {
  TitleFrame, TracksFrame, CriteriaFrame, ComparisonFrame, DiscographyFrame
} from '@/lib/export/frames.jsx'

const THEME = { gradient: true, glass: true, align: 'top', textSize: 'auto', featureDrop: 2 }

export default function RenderFrames ({ data }) {
  const [palette, setPalette] = useState(null)

  useEffect(() => {
    extractPalette(data.review.album.coverProxied)
      .then(setPalette)
      .catch(() => setPalette(fallbackPalette()))
  }, [data])

  if (!palette) return null

  const tracks = data.review.album.tracks.slice(0, 14)
  const frames = [
    <TitleFrame data={data} palette={palette} theme={THEME} />,
    <TracksFrame data={data} palette={palette} theme={THEME} tracks={tracks} dense={false} />,
    <CriteriaFrame data={data} palette={palette} theme={THEME} />,
    <ComparisonFrame data={data} palette={palette} theme={THEME} />,
    data.discographies[0]
      ? <DiscographyFrame group={data.discographies[0]} page={1} pages={1}
          currentAlbumName={data.review.album.name} palette={palette} theme={THEME} />
      : null
  ].filter(Boolean)

  return (
    <div id="frames" data-ready="1" style={{ background: '#000' }}>
      {frames.map((f, i) => (
        <div key={i} data-frame={i} style={{ width: 1080, height: 1920, overflow: 'hidden' }}>{f}</div>
      ))}
    </div>
  )
}
