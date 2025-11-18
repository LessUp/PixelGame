import type { StateCreator } from 'zustand'
import type { PixelStore } from './pixel-types'
import { clamp } from '../utils/math'

export type PixelSocket = {
  sendPlacePixel: (x: number, y: number, c: number) => boolean
  sendFillRect: (x0: number, y0: number, x1: number, y1: number, c: number) => boolean
}

export const createPixelToolsSlice = (
  socket: PixelSocket,
): StateCreator<PixelStore, [], []> => (set, get) => ({
  cooldownMs: 5000,
  lastPlacedAt: 0,
  tool: 'paint',
  selection: null,
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
      const lim = get().historyLimit
      while (h.length > lim) h.shift()
      set({ version: get().version + 1, history: h, dirty: d, selection: null, lastPlacedAt: Date.now() })
      get().save()
      socket.sendFillRect(x0, y0, x1, y1, col)
    }
    return changed
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
  setSelected: (i) => set({ selected: clamp(i, 0, get().palette.length - 1) }),
})
