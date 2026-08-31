// One colour model for the whole site: the light in every room comes off a cover.

export function toHsl (r, g, b) {
  r /= 255; g /= 255; b /= 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  const l = (mx + mn) / 2
  if (d === 0) return [41, 0, l]
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
  let h
  if (mx === r) h = ((g - b) / d) % 6
  else if (mx === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return [(h * 60 + 360) % 360, s, l]
}

export function fromHsl (h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const seg = [[c,x,0],[x,c,0],[0,c,x],[0,x,c],[x,0,c],[c,0,x]][Math.floor(h / 60) % 6]
  return seg.map(v => Math.round((v + m) * 255)).join(', ')
}

// Weight by saturation * luminance: near-black pixels are noise, not colour.
export function dominant (img, size = 40) {
  try {
    const c = document.createElement('canvas')
    c.width = c.height = size
    const ctx = c.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0, size, size)
    const { data } = ctx.getImageData(0, 0, size, size)
    let r = 0, g = 0, b = 0, w = 0
    for (let i = 0; i < data.length; i += 4) {
      const R = data[i], G = data[i + 1], B = data[i + 2]
      const mx = Math.max(R, G, B), mn = Math.min(R, G, B)
      const sat = mx === 0 ? 0 : (mx - mn) / mx
      const lum = (0.299 * R + 0.587 * G + 0.114 * B) / 255
      const weight = sat * lum
      r += R * weight; g += G * weight; b += B * weight; w += weight
    }
    if (w < 1) return null
    const [h, s0, l0] = toHsl(r / w, g / w, b / w)
    return fromHsl(h, Math.max(0.5, Math.min(0.82, s0)), Math.max(0.55, Math.min(0.68, l0)))
  } catch { return null }
}

// Load a cover off-DOM and read its colour.
export function coverColour (src) {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(dominant(img))
    img.onerror = () => resolve(null)
    img.src = src
  })
}
