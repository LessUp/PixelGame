import type { StateCreator } from 'zustand'
import type { PixelStore, PixelCoreState } from './pixel-types'
import { paletteToRGB } from '../utils/color'

export const createPixelCoreSlice = (
  width: number,
  height: number,
  pixels: Uint8Array,
  defaultPalette: string[],
): StateCreator<PixelStore, [], [], PixelCoreState> => (set, get) => ({
  width,
  height,
  pixels,
  palette: defaultPalette,
  paletteRGB: paletteToRGB(defaultPalette),
  selected: 1,
  version: 0,
  dirty: [],
  fullRedraw: true,
  consumeDirty: () => {
    const full = get().fullRedraw
    const list = get().dirty.slice()
    set({ dirty: [], fullRedraw: false })
    return { full, list }
  },
})
