import { create, type StateCreator } from 'zustand'
import { createStore } from 'zustand/vanilla'
import wsClient, { type ServerMessage, type PixelUpdate } from '../services/wsClient'

type Viewport = {
  scale: number
  offsetX: number
  offsetY: number
}

type Tool = 'paint' | 'selectRect'

type CursorStyle = 'outline' | 'crosshair'

type HistoryItem = { idx: number; prev: number; next: number }

export type PixelStore = {
  width: number
  height: number
  pixels: Uint8Array
  palette: string[]
  paletteRGB: Uint8ClampedArray
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
  wsStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
  wsError: string | null
  wsLastHeartbeat: number | null
  setWsUrl: (url: string) => void
  connectWS: (url?: string) => void
  disconnectWS: () => void
  applyRemotePixels: (payload: ServerMessage | PixelUpdate[] | null | undefined) => void
  authoritativeMode: boolean
  setAuthoritativeMode: (v: boolean) => void
  pendingOps: { idx: number; prev: number }[]
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
  cursorStyle: CursorStyle
  cursorColor: string
  cursorCooldownColor: string
  cursorPipetteColor: string
  showCursorHints: boolean
  setCursorStyle: (style: CursorStyle) => void
  setCursorColor: (color: string) => void
  setCursorCooldownColor: (color: string) => void
  setCursorPipetteColor: (color: string) => void
  setShowCursorHints: (v: boolean) => void
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

const warn = (message: string, err: unknown) => {
  if (typeof console !== 'undefined') {
    console.warn(`[pixel-store] ${message}`, err)
  }
}

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

function paletteToRGB(palette: string[]): Uint8ClampedArray {
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

const defaultPalette: string[] = [
  '#000000','#FFFFFF','#FF0000','#00FF00','#0000FF','#FFFF00','#FF00FF','#00FFFF',
  '#808080','#800000','#808000','#008000','#800080','#008080','#000080','#C0C0C0',
  '#FFA500','#A52A2A','#8B4513','#2E8B57','#228B22','#3CB371','#66CDAA','#20B2AA',
  '#5F9EA0','#4682B4','#1E90FF','#6495ED','#7B68EE','#EE82EE','#FFC0CB','#FFD700'
]

const STORAGE_KEY = 'pixel-board-v1'

type PixelStoreDeps = {
  wsClient?: typeof wsClient
}

type PlaceMessage = Extract<ServerMessage, { t: 'place' }>
type FillRectMessage = Extract<ServerMessage, { t: 'fillRect' }>

const createPixelStoreState = (socket: typeof wsClient): StateCreator<PixelStore, [], []> => (set, get) => {
  const width = 1024
  const height = 1024
  const pixels = new Uint8Array(width * height)
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const obj = JSON.parse(raw)
      if (obj && obj.w === width && obj.h === height && typeof obj.b64 === 'string') {
        const u8 = b64ToU8(obj.b64)
        if (u8.length === pixels.length) pixels.set(u8)
      }
    }
  } catch (err) {
    warn('读取本地存档失败', err)
  }

  return {
    width,
    height,
    pixels,
    palette: defaultPalette,
    paletteRGB: paletteToRGB(defaultPalette),
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
        socket.sendFillRect(x0, y0, x1, y1, col)
      }
      return changed
    },
    wsEnabled: false,
    wsUrl: '',
    wsStatus: 'disconnected',
    wsError: null,
    wsLastHeartbeat: null,
    authoritativeMode: false,
    pendingOps: [],
    setWsUrl: (url: string) => set({ wsUrl: url.trim() }),
    connectWS: (url) => {
      const target = (url || get().wsUrl).trim()
      if (!target) {
        set({ wsError: '请先输入服务器地址', wsStatus: 'error' })
        return
      }
      set({ wsUrl: target, wsStatus: 'connecting', wsError: null })
      try {
        const connected = socket.connect(target, {
          onOpen: () => set({ wsEnabled: true, wsStatus: 'connected', wsError: null, wsLastHeartbeat: Date.now() }),
          onClose: () => set((state) => ({ wsEnabled: false, wsStatus: state.wsStatus === 'connecting' ? 'connecting' : 'disconnected' })),
          onError: (message) => {
            set({ wsEnabled: false, wsStatus: 'error', wsError: message || 'WebSocket 连接异常' })
          },
          onReconnect: () => set({ wsStatus: 'connecting' }),
          onHeartbeat: (timestamp) => set({ wsLastHeartbeat: timestamp, wsStatus: 'connected' }),
          onMessage: (msg) => {
            try {
              get().applyRemotePixels(msg)
            } catch (err) {
              console.warn('[ws] 处理消息失败', err)
            }
          },
        })
        if (!connected) {
          set({ wsEnabled: false, wsStatus: 'error', wsError: '当前环境不支持 WebSocket' })
        }
      } catch (err) {
        console.error('[ws] 连接失败', err)
        set({ wsEnabled: false, wsStatus: 'error', wsError: '连接 WebSocket 时发生异常' })
      }
    },
    disconnectWS: () => {
      try {
        socket.disconnect()
      } catch (err) {
        console.warn('[ws] 主动断开时发生异常', err)
      }
      set({ wsEnabled: false, wsStatus: 'disconnected' })
    },
    applyRemotePixels: (payload) => {
      if (!payload) return

      const applyBatch = (list: PixelUpdate[]) => {
        if (!Array.isArray(list) || !list.length) return
        const d = get().dirty
        let changed = false
        for (const it of list) {
          const x = it.x | 0
          const y = it.y | 0
          const c = it.c | 0
          if (x < 0 || y < 0 || x >= get().width || y >= get().height) continue
          const idx = y * get().width + x
          const prev = get().pixels[idx]
          if (prev !== c) {
            get().pixels[idx] = c
            if (d.length < 10000) d.push(idx)
            changed = true
          }
        }
        if (changed) set({ version: get().version + 1, dirty: d })
        if (get().authoritativeMode) {
          const width = get().width
          const pend = get().pendingOps
          if (pend.length) {
            const keep = pend.filter(op => !list.some(it => (it.y * width + it.x) === op.idx && get().pixels[op.idx] === it.c))
            if (keep.length !== pend.length) set({ pendingOps: keep })
          }
        }
      }

      if (Array.isArray(payload)) {
        applyBatch(payload)
        return
      }

      const msg = payload as ServerMessage
      switch (msg.t) {
        case 'place': {
          const { x, y, c } = msg as PlaceMessage
          applyBatch([{ x, y, c }])
          break
        }
        case 'multi':
        case 'batch':
        case 'pixels':
          applyBatch(Array.isArray(msg.list) ? msg.list : [])
          break
        case 'fillRect': {
          const { x0, y0, x1, y1, c } = msg as FillRectMessage
          const d = get().dirty
          let changed = false
          for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
              if (x < 0 || y < 0 || x >= get().width || y >= get().height) continue
              const idx = y * get().width + x
              const prev = get().pixels[idx]
              if (prev !== c) {
                get().pixels[idx] = c
                if (d.length < 10000) d.push(idx)
                changed = true
              }
            }
          }
          if (changed) set({ version: get().version + 1, dirty: d })
          if (get().authoritativeMode) {
            const pend = get().pendingOps
            if (pend.length) {
              const keep = pend.filter(op => {
                const x = op.idx % get().width
                const y = (op.idx / get().width) | 0
                const inRect = x >= x0 && x <= x1 && y >= y0 && y <= y1
                return !(inRect && get().pixels[op.idx] === c)
              })
              if (keep.length !== pend.length) set({ pendingOps: keep })
            }
          }
          break
        }
        case 'pong':
        case 'heartbeat':
        case 'hb':
        case 'ack':
          set({ wsLastHeartbeat: Date.now(), wsStatus: 'connected' })
          break
        case 'error': {
          const message = typeof msg.message === 'string' ? msg.message : '服务器返回错误'
          console.error('[ws] 服务器错误', msg)
          set({ wsError: message, wsStatus: 'error' })
          if (get().authoritativeMode) {
            const pend = get().pendingOps
            if (pend.length) {
              const d = get().dirty
              for (const op of pend) {
                get().pixels[op.idx] = op.prev
                if (d.length < 10000) d.push(op.idx)
              }
              set({ version: get().version + 1, dirty: d, pendingOps: [] })
              get().save()
            }
          }
          break
        }
        case 'denied':
        case 'forbidden': {
          const reason = 'reason' in msg ? msg.reason : undefined
          const message = typeof msg.message === 'string'
            ? msg.message
            : typeof reason === 'string'
              ? reason
              : '权限不足'
          console.warn('[ws] 权限不足', msg)
          set({ wsError: message, wsStatus: 'error' })
          if (get().authoritativeMode) {
            const pend = get().pendingOps
            if (pend.length) {
              const d = get().dirty
              for (const op of pend) {
                get().pixels[op.idx] = op.prev
                if (d.length < 10000) d.push(op.idx)
              }
              set({ version: get().version + 1, dirty: d, pendingOps: [] })
              get().save()
            }
          }
          break
        }
        default:
          console.debug('[ws] 未识别的消息类型', msg)
      }
    },
    gridColor: '#ffffff',
    gridAlpha: 0.08,
    gridMinScale: 8,
    setGridColor: (c: string) => set({ gridColor: c || '#ffffff' }),
    setGridAlpha: (a: number) => set({ gridAlpha: clamp(a, 0, 1) }),
    setGridMinScale: (s: number) => set({ gridMinScale: clamp(Math.round(s), 1, 64) }),
    cursorStyle: 'outline',
    cursorColor: '#ffffff',
    cursorCooldownColor: '#f97316',
    cursorPipetteColor: '#38bdf8',
    showCursorHints: true,
    setCursorStyle: (style) => set({ cursorStyle: style }),
    setCursorColor: (color: string) => set({ cursorColor: color || '#ffffff' }),
    setCursorCooldownColor: (color: string) => set({ cursorCooldownColor: color || '#f97316' }),
    setCursorPipetteColor: (color: string) => set({ cursorPipetteColor: color || '#38bdf8' }),
    setShowCursorHints: (v: boolean) => set({ showCursorHints: !!v }),
    setSelected: (i) => set({ selected: clamp(i, 0, get().palette.length - 1) }),
    setAuthoritativeMode: (v: boolean) => set({ authoritativeMode: !!v }),
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
      socket.sendPlacePixel(x, y, col)
      if (get().wsEnabled && get().authoritativeMode) {
        const pend = get().pendingOps
        if (pend.length < 10000) pend.push({ idx, prev: cur })
        set({ pendingOps: pend })
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
      } catch (err) {
        warn('保存像素数据失败', err)
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
        cursor: {
          style: s.cursorStyle,
          color: s.cursorColor,
          cooldown: s.cursorCooldownColor,
          pipette: s.cursorPipetteColor,
          hints: s.showCursorHints,
        },
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
        if (obj.cursor && typeof obj.cursor === 'object') {
          const cur = obj.cursor
          if (cur.style === 'outline' || cur.style === 'crosshair') set({ cursorStyle: cur.style })
          if (typeof cur.color === 'string') set({ cursorColor: cur.color })
          if (typeof cur.cooldown === 'string') set({ cursorCooldownColor: cur.cooldown })
          if (typeof cur.pipette === 'string') set({ cursorPipetteColor: cur.pipette })
          if (typeof cur.hints === 'boolean') set({ showCursorHints: cur.hints })
        }
        return true
      } catch (err) {
        warn('解析分享链接失败', err)
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
          set({ version: get().version + 1, selected: typeof obj.s === 'number' ? obj.s : get().selected, fullRedraw: true, dirty: [] })
        }
      } catch (err) {
        warn('加载像素数据失败', err)
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
      const pal = s.paletteRGB
      for (let i = 0, p = 0; i < s.pixels.length; i++, p += 4) {
        const base = s.pixels[i] * 3
        data[p] = pal[base] ?? 0
        data[p+1] = pal[base + 1] ?? 0
        data[p+2] = pal[base + 2] ?? 0
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
          set({ palette: obj.palette, paletteRGB: paletteToRGB(obj.palette) })
        }
        set({ version: get().version + 1, fullRedraw: true, dirty: [] })
        get().save()
        return true
      } catch (err) {
        warn('解析分享链接失败', err)
        return false
      }
    },
    centerOn: (x, y) => {
      const s = get()
      const ox = s.canvasW / 2 - x * s.viewport.scale
      const oy = s.canvasH / 2 - y * s.viewport.scale
      set({ viewport: { ...s.viewport, offsetX: ox, offsetY: oy } })
    },
  }
}

export const createPixelStore = (deps: PixelStoreDeps = {}) =>
  createStore<PixelStore>(createPixelStoreState(deps.wsClient ?? wsClient))

export const usePixelStore = create<PixelStore>(createPixelStoreState(wsClient))

export default usePixelStore
