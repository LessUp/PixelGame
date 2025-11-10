import { create } from 'zustand'

type Viewport = {
  scale: number
  offsetX: number
  offsetY: number
}

type Tool = 'paint' | 'selectRect'

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
  historyLimit: number
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
  setHistoryLimit: (n: number) => void
  exportPNG: () => string
  exportJSON: () => string
  importJSON: (text: string) => boolean
  centerOn: (x: number, y: number) => void
  exportHash: () => string
  applyHash: (hash: string) => boolean
  // tools & selection
  tool: Tool
  setTool: (t: Tool) => void
  selection: { x0: number; y0: number; x1: number; y1: number } | null
  startSelection: (x: number, y: number) => void
  updateSelection: (x: number, y: number) => void
  clearSelection: () => void
  fillSelection: (colorIndex?: number) => number
  // websocket adapter (optional)
  wsEnabled: boolean
  wsUrl: string
  connectWS: (url?: string) => void
  disconnectWS: () => void
  applyRemotePixels: (list: Array<{ x: number; y: number; c: number }>) => void
  showGrid: boolean
  setShowGrid: (v: boolean) => void
  dirty: number[]
  fullRedraw: boolean
  consumeDirty: () => { full: boolean; list: number[] }
  gridColor: string
  gridAlpha: number
  gridMinScale: number
  setGridColor: (c: string) => void
  setGridAlpha: (a: number) => void
  setGridMinScale: (s: number) => void
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
  const pixels = new Uint8Array(width * height)
  let ws: WebSocket | null = null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const obj = JSON.parse(raw)
      if (obj && obj.w === width && obj.h === height && typeof obj.b64 === 'string') {
        const u8 = b64ToU8(obj.b64)
        if (u8.length === pixels.length) pixels.set(u8)
      }
    }
  } catch {
    /* ignore malformed persisted data */
  }

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
    historyLimit: 200,
    tool: 'paint',
    selection: null,
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
    setTool: (t) => set({ tool: t }),
    startSelection: (x, y) => set({ selection: { x0: x, y0: y, x1: x, y1: y } }),
    updateSelection: (x, y) => {
      const s = get().selection
      if (!s) return
      set({ selection: { ...s, x1: x, y1: y } })
    },
    clearSelection: () => set({ selection: null }),
    fillSelection: (colorIndex) => {
      const sel = get().selection
      if (!sel) return 0
      const x0 = clamp(Math.min(sel.x0, sel.x1), 0, get().width - 1)
      const y0 = clamp(Math.min(sel.y0, sel.y1), 0, get().height - 1)
      const x1 = clamp(Math.max(sel.x0, sel.x1), 0, get().width - 1)
      const y1 = clamp(Math.max(sel.y0, sel.y1), 0, get().height - 1)
      const col = typeof colorIndex === 'number' ? colorIndex : get().selected
      let changed = 0
      const h = get().history
      const d = get().dirty
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const idx = y * get().width + x
          const prev = get().pixels[idx]
          if (prev === col) continue
          get().pixels[idx] = col
          h.push({ idx, prev, next: col })
          if (d.length < 10000) d.push(idx)
          changed++
        }
      }
      if (changed) {
        // trim history if beyond limit
        const lim = get().historyLimit
        while (h.length > lim) h.shift()
        set({ version: get().version + 1, history: h, dirty: d, selection: null, lastPlacedAt: Date.now() })
        get().save()
        // broadcast simplified change as a list may be large; send bbox + color
        if (ws && ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({ t: 'fillRect', x0, y0, x1, y1, c: col }))
          } catch {
            /* ignore network send failure */
          }
        }
      }
      return changed
    },
    wsEnabled: false,
    wsUrl: '',
    connectWS: (url) => {
      const target = url || get().wsUrl
      if (!target) return

      try {
        if (ws) {
          try {
            ws.close()
          } catch {
            /* ignore close error */
          }
        }

        ws = new WebSocket(target)
        ws.onopen = () => set({ wsEnabled: true, wsUrl: target })
        ws.onclose = () => set({ wsEnabled: false })
        ws.onerror = () => set({ wsEnabled: false })
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data)
            if (msg.t === 'place') {
              const x = msg.x | 0
              const y = msg.y | 0
              const c = msg.c | 0
              if (x >= 0 && y >= 0 && x < get().width && y < get().height) {
                const idx = y * get().width + x
                const prev = get().pixels[idx]
                if (prev !== c) {
                  get().pixels[idx] = c
                  const d = get().dirty
                  if (d.length < 10000) d.push(idx)
                  set({ version: get().version + 1, dirty: d })
                }
              }
            } else if (msg.t === 'fillRect') {
              const { x0, y0, x1, y1, c } = msg
              const d = get().dirty
              for (let y = y0; y <= y1; y++) {
                for (let x = x0; x <= x1; x++) {
                  if (x < 0 || y < 0 || x >= get().width || y >= get().height) continue
                  const idx = y * get().width + x
                  const prev = get().pixels[idx]
                  if (prev !== c) {
                    get().pixels[idx] = c
                    if (d.length < 10000) d.push(idx)
                  }
                }
              }
              set({ version: get().version + 1, dirty: d })
            } else if (msg.t === 'multi') {
              const arr = Array.isArray(msg.list) ? msg.list : []
              get().applyRemotePixels(arr)
            }
          } catch {
            /* ignore malformed websocket message */
          }
        }
      } catch {
        /* websocket connection attempt failed */
      }
    },
    disconnectWS: () => {
      try {
        if (ws) ws.close()
      } catch {
        /* ignore close error */
      }
      ws = null
      set({ wsEnabled: false })
    },
    applyRemotePixels: (list) => {
      const d = get().dirty
      for (const it of list) {
        const x = (it.x | 0)
        const y = (it.y | 0)
        const c = (it.c | 0)
        if (x < 0 || y < 0 || x >= get().width || y >= get().height) continue
        const idx = y * get().width + x
        const prev = get().pixels[idx]
        if (prev !== c) {
          get().pixels[idx] = c
          if (d.length < 10000) d.push(idx)
        }
      }
      set({ version: get().version + 1, dirty: d })
    },
    gridColor: '#ffffff',
    gridAlpha: 0.08,
    gridMinScale: 8,
    setGridColor: (c: string) => set({ gridColor: c || '#ffffff' }),
    setGridAlpha: (a: number) => set({ gridAlpha: clamp(a, 0, 1) }),
    setGridMinScale: (s: number) => set({ gridMinScale: clamp(Math.round(s), 1, 64) }),
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
      const lim = get().historyLimit
      if (h.length > lim) h.shift()
      const d = get().dirty
      if (d.length < 10000) d.push(idx)
      set({ version: get().version + 1, lastPlacedAt: Date.now(), history: h, dirty: d })
      get().save()
      // broadcast if ws connected
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ t: 'place', x, y, c: col }))
        } catch {
          /* ignore network send failure */
        }
      }
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
    setHistoryLimit: (n: number) => {
      const lim = clamp(Math.round(n), 1, 1000)
      const h = get().history
      while (h.length > lim) h.shift()
      set({ historyLimit: lim, history: h })
    },
    save: () => {
      try {
        const s = get()
        const b64 = u8ToB64(s.pixels)
        const payload = { w: s.width, h: s.height, b64, s: s.selected }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
      } catch {
        /* ignore persist failure */
      }
    },
    exportHash: () => {
      const s = get()
      const obj = {
        v: 1,
        vp: s.viewport,
        s: s.selected,
        g: s.showGrid,
        gc: s.gridColor,
        ga: s.gridAlpha,
        gs: s.gridMinScale,
      }
      const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(obj))))
      return `#pb=${b64}`
    },
    applyHash: (hash: string) => {
      if (!hash || !hash.startsWith('#pb=')) return false
      try {
        const b64 = hash.slice(4)
        const json = decodeURIComponent(escape(atob(b64)))
        const obj = JSON.parse(json)
        if (!obj || obj.v !== 1) return false
        const vp = obj.vp
        if (vp && typeof vp.scale === 'number' && typeof vp.offsetX === 'number' && typeof vp.offsetY === 'number') {
          set({ viewport: { scale: clamp(vp.scale, 1, 64), offsetX: vp.offsetX, offsetY: vp.offsetY } })
        }
        if (typeof obj.s === 'number') set({ selected: clamp(obj.s, 0, get().palette.length - 1) })
        if (typeof obj.g === 'boolean') set({ showGrid: obj.g })
        if (typeof obj.gc === 'string') set({ gridColor: obj.gc })
        if (typeof obj.ga === 'number') set({ gridAlpha: clamp(obj.ga, 0, 1) })
        if (typeof obj.gs === 'number') set({ gridMinScale: clamp(Math.round(obj.gs), 1, 64) })
        return true
      } catch {
        return false
      }
    },
    load: () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return
        const obj = JSON.parse(raw)
        if (obj && obj.w === get().width && obj.h === get().height && typeof obj.b64 === 'string') {
          const u8 = b64ToU8(obj.b64)
          if (u8.length === get().pixels.length) get().pixels.set(u8)
          set({
            version: get().version + 1,
            selected: typeof obj.s === 'number' ? obj.s : get().selected,
            fullRedraw: true,
            dirty: [],
          })
        }
      } catch {
        /* ignore load failure */
      }
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
