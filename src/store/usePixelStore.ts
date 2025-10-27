import { create } from 'zustand'

type Viewport = {
  scale: number
  offsetX: number
  offsetY: number
}

type HistoryItem = { idx: number; prev: number; next: number }

type PixelStore = {
  width: number
  height: number
  pixels: Uint8Array
  palette: string[]
  selected: number
  version: number
  cooldownMs: number
  lastPlacedAt: number
  viewport: Viewport
  history: HistoryItem[]
  canvasW: number
  canvasH: number
  setCanvasSize: (w: number, h: number) => void
  setSelected: (i: number) => void
  setViewport: (v: Partial<Viewport>) => void
  panBy: (dx: number, dy: number) => void
  setScale: (scale: number, anchor?: { x: number; y: number }) => void
  getPixel: (x: number, y: number) => number
  canPlace: () => boolean
  placePixel: (x: number, y: number, colorIndex?: number) => boolean
  pickColor: (x: number, y: number) => void
  undo: () => void
  save: () => void
  load: () => void
  clear: () => void
  exportPNG: () => string
  exportJSON: () => string
  importJSON: (text: string) => boolean
  centerOn: (x: number, y: number) => void
  showGrid: boolean
  setShowGrid: (v: boolean) => void
  dirty: number[]
  fullRedraw: boolean
  consumeDirty: () => { full: boolean; list: number[] }
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

function u8ToB64(u8: Uint8Array): string {
  let out = ''
  const CHUNK = 0x8000
  for (let i = 0; i < u8.length; i += CHUNK) {
    const sub = u8.subarray(i, i + CHUNK)
    out += String.fromCharCode.apply(null, Array.from(sub))
  }
  return btoa(out)
}

function b64ToU8(b64: string): Uint8Array {
  const bin = atob(b64)
  const u8 = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i)
  return u8
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const v = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

const defaultPalette: string[] = [
  '#000000','#FFFFFF','#FF0000','#00FF00','#0000FF','#FFFF00','#FF00FF','#00FFFF',
  '#808080','#800000','#808000','#008000','#800080','#008080','#000080','#C0C0C0',
  '#FFA500','#A52A2A','#8B4513','#2E8B57','#228B22','#3CB371','#66CDAA','#20B2AA',
  '#5F9EA0','#4682B4','#1E90FF','#6495ED','#7B68EE','#EE82EE','#FFC0CB','#FFD700'
]

const STORAGE_KEY = 'pixel-board-v1'

export const usePixelStore = create<PixelStore>((set, get) => {
  const width = 1024
  const height = 1024
  let pixels = new Uint8Array(width * height)
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const obj = JSON.parse(raw)
      if (obj && obj.w === width && obj.h === height && typeof obj.b64 === 'string') {
        const u8 = b64ToU8(obj.b64)
        if (u8.length === pixels.length) pixels = u8
      }
    }
  } catch {}

  return {
    width,
    height,
    pixels,
    palette: defaultPalette,
    selected: 1,
    version: 0,
    cooldownMs: 5000,
    lastPlacedAt: 0,
    viewport: { scale: 8, offsetX: 0, offsetY: 0 },
    history: [],
    canvasW: 0,
    canvasH: 0,
    setCanvasSize: (w, h) => set({ canvasW: w, canvasH: h }),
    showGrid: false,
    setShowGrid: (v: boolean) => set({ showGrid: !!v }),
    dirty: [],
    fullRedraw: true,
    consumeDirty: () => {
      const full = get().fullRedraw
      const list = get().dirty.slice()
      set({ dirty: [], fullRedraw: false })
      return { full, list }
    },
    setSelected: (i) => set({ selected: clamp(i, 0, get().palette.length - 1) }),
    setViewport: (v) => set({ viewport: { ...get().viewport, ...v } }),
    panBy: (dx, dy) => set({ viewport: { ...get().viewport, offsetX: get().viewport.offsetX + dx, offsetY: get().viewport.offsetY + dy } }),
    setScale: (scale, anchor) => {
      const vp = get().viewport
      const ns = clamp(scale, 1, 64)
      if (anchor) {
        const wx = (anchor.x - vp.offsetX) / vp.scale
        const wy = (anchor.y - vp.offsetY) / vp.scale
        const nx = anchor.x - wx * ns
        const ny = anchor.y - wy * ns
        set({ viewport: { scale: ns, offsetX: nx, offsetY: ny } })
      } else {
        set({ viewport: { ...vp, scale: ns } })
      }
    },
    getPixel: (x, y) => {
      if (x < 0 || y < 0 || x >= get().width || y >= get().height) return 0
      return get().pixels[y * get().width + x]
    },
    canPlace: () => Date.now() - get().lastPlacedAt >= get().cooldownMs,
    placePixel: (x, y, colorIndex) => {
      if (x < 0 || y < 0 || x >= get().width || y >= get().height) return false
      if (!get().canPlace()) return false
      const idx = y * get().width + x
      const col = colorIndex ?? get().selected
      const cur = get().pixels[idx]
      if (cur === col) return false
      get().pixels[idx] = col
      const h = get().history
      h.push({ idx, prev: cur, next: col })
      if (h.length > 100) h.shift()
      const d = get().dirty
      if (d.length < 10000) d.push(idx)
      set({ version: get().version + 1, lastPlacedAt: Date.now(), history: h, dirty: d })
      get().save()
      return true
    },
    pickColor: (x, y) => {
      const v = get().getPixel(x, y)
      set({ selected: v })
    },
    undo: () => {
      const h = get().history
      if (!h.length) return
      const op = h.pop() as HistoryItem
      get().pixels[op.idx] = op.prev
      set({ version: get().version + 1, history: h })
      get().save()
    },
    save: () => {
      try {
        const s = get()
        const b64 = u8ToB64(s.pixels)
        const payload = { w: s.width, h: s.height, b64, s: s.selected }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
      } catch {}
    },
    load: () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return
        const obj = JSON.parse(raw)
        if (obj && obj.w === get().width && obj.h === get().height && typeof obj.b64 === 'string') {
          const u8 = b64ToU8(obj.b64)
          if (u8.length === get().pixels.length) get().pixels.set(u8)
          set({ version: get().version + 1, selected: typeof obj.s === 'number' ? obj.s : get().selected, fullRedraw: true, dirty: [] })
        }
      } catch {}
    },
    clear: () => {
      get().pixels.fill(0)
      set({ version: get().version + 1, history: [], fullRedraw: true, dirty: [] })
      get().save()
    },
    exportPNG: () => {
      const s = get()
      const c = document.createElement('canvas')
      c.width = s.width
      c.height = s.height
      const ctx = c.getContext('2d')!
      const img = ctx.createImageData(s.width, s.height)
      const data = img.data
      const pal = s.palette.map(hexToRgb)
      for (let i = 0, p = 0; i < s.pixels.length; i++, p += 4) {
        const col = pal[s.pixels[i]] || [0,0,0]
        data[p] = col[0]
        data[p+1] = col[1]
        data[p+2] = col[2]
        data[p+3] = 255
      }
      ctx.putImageData(img, 0, 0)
      return c.toDataURL('image/png')
    },
    exportJSON: () => {
      const s = get()
      const b64 = u8ToB64(s.pixels)
      return JSON.stringify({ w: s.width, h: s.height, b64, palette: s.palette }, null, 2)
    },
    importJSON: (text: string) => {
      try {
        const obj = JSON.parse(text)
        if (!obj || obj.w !== get().width || obj.h !== get().height || typeof obj.b64 !== 'string') return false
        const u8 = b64ToU8(obj.b64)
        if (u8.length !== get().pixels.length) return false
        get().pixels.set(u8)
        if (Array.isArray(obj.palette)) {
          set({ palette: obj.palette })
        }
        set({ version: get().version + 1, fullRedraw: true, dirty: [] })
        get().save()
        return true
      } catch {
        return false
      }
    },
    centerOn: (x, y) => {
      const s = get()
      const ox = s.canvasW / 2 - x * s.viewport.scale
      const oy = s.canvasH / 2 - y * s.viewport.scale
      set({ viewport: { ...s.viewport, offsetX: ox, offsetY: oy } })
    }
  }
})

export default usePixelStore
