import type { StateCreator } from 'zustand'
import type { PixelStore } from './pixel-types'
import { clamp } from '../utils/math'

export const createPixelViewportSlice: StateCreator<PixelStore, [], []> = (set, get) => ({
  viewport: { scale: 8, offsetX: 0, offsetY: 0 },
  canvasW: 0,
  canvasH: 0,
  setCanvasSize: (w: number, h: number) => set({ canvasW: w, canvasH: h }),
  setViewport: (v) => set({ viewport: { ...get().viewport, ...v } }),
  panBy: (dx, dy) => {
    const vp = get().viewport
    set({ viewport: { ...vp, offsetX: vp.offsetX + dx, offsetY: vp.offsetY + dy } })
  },
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
  centerOn: (x, y) => {
    const s = get()
    const ox = s.canvasW / 2 - x * s.viewport.scale
    const oy = s.canvasH / 2 - y * s.viewport.scale
    set({ viewport: { ...s.viewport, offsetX: ox, offsetY: oy } })
  },
})
