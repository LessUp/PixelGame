export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const v = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

export function paletteToRGB(palette: string[]): Uint8ClampedArray {
  const buff = new Uint8ClampedArray(palette.length * 3)
  for (let i = 0; i < palette.length; i++) {
    const [r, g, b] = hexToRgb(palette[i])
    const cursor = i * 3
    buff[cursor] = r
    buff[cursor + 1] = g
    buff[cursor + 2] = b
  }
  return buff
}
