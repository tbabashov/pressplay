// Five worlds the slides can be rendered in. Each one owns its background, its
// surfaces, its dividers and its ink, so the frames themselves stay unchanged.
// A style returns CSS values, not class names: the rasteriser draws through an
// SVG foreignObject where stylesheets do not follow.

const hueOf = p => p?.hue ?? 240
const satOf = (p, cap = 64) => Math.min(cap, p?.sat ?? 40)

// ---------- Press Play, the signature look ----------
function signatureBg (palette, theme) {
  if (!theme?.gradient) {
    return `linear-gradient(180deg, ${palette.bgTop} 0%, ${palette.bgBottom} 100%)`
  }
  const h = hueOf(palette)
  const s = satOf(palette)
  const at = d => Math.round((h + d + 360) % 360)
  const sat = d => Math.min(76, s + d)
  return [
    `radial-gradient(74% 44% at 16% 3%, hsla(${at(15)}, ${sat(14)}%, 33%, 0.8) 0%, hsla(${at(15)}, ${s}%, 15%, 0) 64%)`,
    `radial-gradient(64% 40% at 90% 19%, hsla(${at(-17)}, ${sat(8)}%, 26%, 0.72) 0%, hsla(${at(-17)}, ${s}%, 12%, 0) 62%)`,
    `radial-gradient(92% 50% at 78% 96%, hsla(${at(14)}, ${sat(4)}%, 22%, 0.68) 0%, hsla(${at(14)}, ${s}%, 10%, 0) 66%)`,
    `radial-gradient(80% 42% at 4% 82%, hsla(${at(-8)}, ${s}%, 21%, 0.6) 0%, hsla(${at(-8)}, ${s}%, 9%, 0) 62%)`,
    `linear-gradient(168deg, hsl(${h}, ${s}%, 19%) 0%, hsl(${h}, ${s}%, 11%) 52%, hsl(${h}, ${Math.max(10, s - 12)}%, 6%) 100%)`
  ].join(', ')
}

function signatureSurface (theme, { radius = 30, tint = 0.07, lift = 0 } = {}) {
  if (!theme?.glass) {
    return { background: `rgba(var(--ink-rgb), ${tint + lift})`, borderRadius: radius }
  }
  const a = v => Math.round(Math.min(0.62, v + lift) * 1000) / 1000
  return {
    borderRadius: radius,
    background: `linear-gradient(148deg, rgba(var(--ink-rgb), ${a(0.21)}) 0%, rgba(var(--ink-rgb), ${a(0.085)}) 38%, rgba(var(--ink-rgb), ${a(0.05)}) 72%, rgba(var(--ink-rgb), ${a(0.105)}) 100%)`,
    border: '1.5px solid rgba(var(--ink-rgb), 0.24)',
    boxShadow: [
      `inset 0 1.5px 0 rgba(var(--ink-rgb), ${a(0.5)})`,
      'inset 0 -1.5px 0 rgba(var(--ink-rgb), 0.09)',
      `inset 0 0 70px rgba(var(--ink-rgb), ${a(0.06)})`,
      '0 26px 64px rgba(0,0,0,0.4)'
    ].join(', ')
  }
}

export const STYLES = {
  // ---------------------------------------------------------------- signature
  signature: {
    id: 'signature',
    score: 'pill',
    row: { case: 'none', leaders: false, weight: 700 },
    font: "var(--font-archivo), 'Archivo', -apple-system, sans-serif",
    dome: true,
    type: { displayWeight: 800, displayTrack: '-1px', labelTrack: '9px', labelCase: 'uppercase', labelWeight: 800, coverRadius: '26px', chipRadius: '999px' },
    name: 'Press Play',
    blurb: 'The house look. Lit by the cover, with optional crystal glass.',
    tier: 'paid',
    glassChoice: true,
    ink: '#f5f5f7',
    inkRgb: '255, 255, 255',
    bg: signatureBg,
    surface: signatureSurface,
    rule: theme => `1px solid rgba(var(--ink-rgb), ${theme?.glass ? 0.14 : 0.08})`
  },

  // --------------------------------------------------------------------- free
  // Printed page: cream stock, dark ink, hairline rules, no panels at all.
  paper: {
    id: 'paper',
    score: 'print',
    row: { case: 'none', leaders: true,  weight: 400 },
    font: "var(--font-serif), 'Instrument Serif', Georgia, serif",
    dome: false,
    type: { displayWeight: 700, displayTrack: '-0.5px', labelTrack: '5px', labelCase: 'uppercase', labelWeight: 600, coverRadius: '2px',  chipRadius: '6px' },
    name: 'Paper',
    blurb: 'Printed page. Cream stock, dark ink, rules instead of boxes.',
    tier: 'free',
    ink: '#17150f',
    inkRgb: '23, 21, 15',
    bg: () => [
      'radial-gradient(120% 80% at 50% 0%, #fbf8f1 0%, #f2ece0 60%, #eae3d4 100%)'
    ].join(', '),
    surface: (theme, { radius = 0 } = {}) => ({
      background: 'transparent',
      borderRadius: radius,
      borderTop: '1.5px solid rgba(var(--ink-rgb), 0.22)',
      borderBottom: '1.5px solid rgba(var(--ink-rgb), 0.22)'
    }),
    rule: () => '1px solid rgba(var(--ink-rgb), 0.14)'
  },

  // Gig poster: one flat field of the cover's colour, hard blocks, no softness.
  marquee: {
    id: 'marquee',
    score: 'block',
    row: { case: 'uppercase', leaders: false, weight: 400 },
    font: "var(--font-poster), 'Archivo Black', Impact, sans-serif",
    dome: false,
    type: { displayWeight: 900, displayTrack: '-2.4px', labelTrack: '14px', labelCase: 'uppercase', labelWeight: 900, coverRadius: '0px',  chipRadius: '2px' },
    name: 'Marquee',
    blurb: 'Gig poster. One flat colour field and hard-edged blocks.',
    tier: 'free',
    ink: '#ffffff',
    inkRgb: '255, 255, 255',
    bg: palette => {
      const h = hueOf(palette)
      const s = Math.max(46, satOf(palette, 82))
      return `linear-gradient(160deg, hsl(${h}, ${s}%, 34%) 0%, hsl(${(h + 18) % 360}, ${s}%, 22%) 55%, hsl(${h}, ${Math.max(24, s - 16)}%, 12%) 100%)`
    },
    surface: (theme, { radius = 0 } = {}) => ({
      background: 'rgba(0, 0, 0, 0.42)',
      borderRadius: 4,
      border: '3px solid rgba(var(--ink-rgb), 0.9)',
      boxShadow: '10px 10px 0 rgba(0,0,0,0.34)'
    }),
    rule: () => '2px solid rgba(var(--ink-rgb), 0.28)'
  },

  // Almost nothing: near-black, hairlines, no colour beyond the score chips.
  mono: {
    id: 'mono',
    score: 'bracket',
    row: { case: 'none', leaders: false, weight: 500 },
    font: "var(--font-mono), 'IBM Plex Mono', ui-monospace, monospace",
    dome: false,
    type: { displayWeight: 500, displayTrack: '1.2px',  labelTrack: '13px', labelCase: 'uppercase', labelWeight: 500, coverRadius: '4px',  chipRadius: '4px' },
    name: 'Mono',
    blurb: 'Almost nothing. Near black, hairlines, colour only on the scores.',
    tier: 'free',
    ink: '#f2f2f2',
    inkRgb: '242, 242, 242',
    bg: () => 'linear-gradient(180deg, #0c0c0d 0%, #121213 52%, #0a0a0b 100%)',
    surface: (theme, { radius = 0 } = {}) => ({
      background: 'transparent',
      borderRadius: radius,
      border: '1px solid rgba(var(--ink-rgb), 0.13)'
    }),
    rule: () => '1px solid rgba(var(--ink-rgb), 0.09)'
  },

  // ---------------------------------------------------------------- paid tier
  // Layered light: a mesh of the cover's hue with luminous, softly lit panels.
  aurora: {
    id: 'aurora',
    score: 'ring',
    row: { case: 'none', leaders: false, weight: 600 },
    font: "var(--font-archivo), 'Archivo', -apple-system, sans-serif",
    dome: true,
    type: { displayWeight: 750, displayTrack: '-1.4px', labelTrack: '7px',  labelCase: 'uppercase', labelWeight: 700, coverRadius: '34px', chipRadius: '999px' },
    name: 'Aurora',
    blurb: 'Layered light. A colour mesh with luminous, softly lit panels.',
    tier: 'paid',
    ink: '#ffffff',
    inkRgb: '255, 255, 255',
    bg: palette => {
      const h = hueOf(palette)
      const s = Math.min(78, Math.max(48, satOf(palette, 78)))
      const at = d => Math.round((h + d + 360) % 360)
      return [
        `radial-gradient(58% 40% at 12% 6%, hsla(${at(38)}, ${s}%, 52%, 0.55) 0%, transparent 62%)`,
        `radial-gradient(52% 36% at 88% 14%, hsla(${at(-46)}, ${s}%, 46%, 0.5) 0%, transparent 60%)`,
        `radial-gradient(64% 42% at 74% 88%, hsla(${at(22)}, ${s}%, 44%, 0.48) 0%, transparent 64%)`,
        `radial-gradient(58% 40% at 8% 92%, hsla(${at(-24)}, ${s}%, 40%, 0.42) 0%, transparent 62%)`,
        `linear-gradient(158deg, hsl(${h}, ${Math.max(28, s - 22)}%, 12%) 0%, hsl(${at(20)}, ${Math.max(24, s - 28)}%, 7%) 100%)`
      ].join(', ')
    },
    surface: (theme, { radius = 30, tint = 0.07, lift = 0 } = {}) => ({
      borderRadius: radius,
      background: `linear-gradient(152deg, rgba(var(--ink-rgb), ${0.16 + lift}) 0%, rgba(var(--ink-rgb), ${0.05 + lift}) 46%, rgba(var(--ink-rgb), ${0.09 + lift}) 100%)`,
      border: '1px solid rgba(var(--ink-rgb), 0.26)',
      boxShadow: [
        'inset 0 2px 0 rgba(var(--ink-rgb), 0.42)',
        'inset 0 -60px 90px -60px rgba(var(--ink-rgb), 0.22)',
        '0 30px 80px rgba(0,0,0,0.5)'
      ].join(', ')
    }),
    rule: () => '1px solid rgba(var(--ink-rgb), 0.16)'
  }
}

export const STYLE_LIST = Object.values(STYLES)
export const styleOf = theme => STYLES[theme?.style] || STYLES.signature
