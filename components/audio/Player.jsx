'use client'

import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react'
import { coverColour } from '../../lib/palette'

const Ctx = createContext(null)
export const usePlayer = () => useContext(Ctx)

export default function PlayerProvider ({ children }) {
  const [track, setTrack] = useState(null)     // the album currently loaded
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)  // 0..1
  const [loading, setLoading] = useState(false)

  const audioRef = useRef(null)
  const ctxRef = useRef(null)
  const analyserRef = useRef(null)
  const rafRef = useRef(0)
  const colours = useRef(new Map())

  // Build the graph lazily: an AudioContext created before a gesture starts suspended.
  const graph = useCallback(() => {
    if (!audioRef.current) return null
    if (!ctxRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return null
      const ac = new AC()
      const src = ac.createMediaElementSource(audioRef.current)
      const an = ac.createAnalyser()
      an.fftSize = 128
      an.smoothingTimeConstant = 0.78
      src.connect(an); an.connect(ac.destination)
      ctxRef.current = ac; analyserRef.current = an
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume()
    return analyserRef.current
  }, [])

  // Drive two CSS variables off the signal: an overall level and a bass-weighted
  // pulse. Everything reactive on the page reads these, so there is one loop.
  useEffect(() => {
    const root = document.documentElement
    if (!playing) {
      cancelAnimationFrame(rafRef.current)
      root.style.setProperty('--level', '0')
      root.style.setProperty('--pulse', '0')
      return
    }
    const an = analyserRef.current
    if (!an) return
    const bins = new Uint8Array(an.frequencyBinCount)
    let level = 0, pulse = 0
    // These two live on :root, so writing them invalidates style for the whole
    // document. Only about five rules actually read them, and nobody can see a
    // thousandth of a step, so a write only happens when the value has really
    // moved. Quiet passages stop costing a full recalc every frame.
    let wroteLevel = -1, wrotePulse = -1
    const STEP = 0.012

    const tick = () => {
      an.getByteFrequencyData(bins)
      let sum = 0
      for (let i = 0; i < bins.length; i++) sum += bins[i]
      const avg = sum / bins.length / 255
      let low = 0
      for (let i = 0; i < 6; i++) low += bins[i]
      const bass = low / 6 / 255
      level += (avg - level) * 0.18
      pulse += (bass - pulse) * 0.24

      if (Math.abs(level - wroteLevel) > STEP) {
        wroteLevel = level
        root.style.setProperty('--level', level.toFixed(3))
      }
      if (Math.abs(pulse - wrotePulse) > STEP) {
        wrotePulse = pulse
        root.style.setProperty('--pulse', pulse.toFixed(3))
      }

      if (audioRef.current?.duration) {
        setProgress(audioRef.current.currentTime / audioRef.current.duration)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing])

  // The room takes the colour of whatever is on.
  useEffect(() => {
    if (!track?.cover) return
    let dead = false
    const apply = rgb => {
      if (dead || !rgb) return
      const root = document.documentElement
      root.style.setProperty('--accent', `rgb(${rgb})`)
      root.style.setProperty('--accent-rgb', rgb)
      root.style.setProperty('--accent-soft', `rgba(${rgb}, 0.34)`)
    }
    const cached = colours.current.get(track.cover)
    if (cached) apply(cached)
    else coverColour(track.cover).then(rgb => {
      if (rgb) { colours.current.set(track.cover, rgb); apply(rgb) }
    })
    return () => { dead = true }
  }, [track])

  // Pause and dismiss are different things. Pause leaves the record loaded so
  // the dock stays put and can be resumed; dismiss puts it away entirely, which
  // is what the close button on the dock is for.
  const stop = useCallback(() => {
    audioRef.current?.pause()
    setPlaying(false)
  }, [])

  const toggle = useCallback(async () => {
    const el = audioRef.current
    if (!el || !track) return
    if (playing) { el.pause(); setPlaying(false); return }
    graph()
    try { await el.play(); setPlaying(true) } catch {}
  }, [track, playing, graph])

  const dismiss = useCallback(() => {
    const el = audioRef.current
    if (el) { el.pause(); el.removeAttribute('src'); el.load() }
    setPlaying(false)
    setProgress(0)
    setTrack(null)
    // The room was lit by the record. With nothing loaded it goes back to the
    // default so the page is not left tinted by something no longer playing.
    const r = document.documentElement
    r.style.removeProperty('--accent')
    r.style.removeProperty('--accent-rgb')
    r.style.removeProperty('--accent-soft')
  }, [])

  const play = useCallback(async album => {
    if (!album?.dz) return
    const el = audioRef.current
    if (!el) return

    if (track?.dz === album.dz) {
      if (playing) { el.pause(); setPlaying(false) }
      else { graph(); try { await el.play(); setPlaying(true) } catch {} }
      return
    }

    setTrack(album)
    setProgress(0)
    setLoading(true)
    el.src = `/api/preview/${album.dz}`
    graph()
    try {
      await el.play()
      setPlaying(true)
    } catch {
      setPlaying(false)
    } finally {
      setLoading(false)
    }
  }, [track, playing, graph])

  const seek = useCallback(f => {
    const el = audioRef.current
    if (el?.duration) { el.currentTime = f * el.duration; setProgress(f) }
  }, [])

  return (
    <Ctx.Provider value={{ track, playing, progress, loading, play, stop, toggle, dismiss, seek, analyser: analyserRef }}>
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        preload="none"
        onEnded={() => { setPlaying(false); setProgress(0) }}
        onPause={() => setPlaying(false)}
      />
      {children}
    </Ctx.Provider>
  )
}
