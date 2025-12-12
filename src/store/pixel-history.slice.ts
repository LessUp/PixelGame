import type { StateCreator } from 'zustand'
import type { PixelStore, HistoryItem, PixelHistoryState } from './pixel-types'
import { clamp } from '../utils/math'

export const createPixelHistorySlice: StateCreator<PixelStore, [], [], PixelHistoryState> = (set, get) => ({
  history: [],
  historyLimit: 200,
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
})
