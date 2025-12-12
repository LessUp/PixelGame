import type { StateCreator } from 'zustand'
import type { PixelStore, PixelUiPrefsState, CursorStyle } from './pixel-types'
import { clamp } from '../utils/math'

export const createPixelUiPrefsSlice: StateCreator<PixelStore, [], [], PixelUiPrefsState> = (set) => ({
  showGrid: false,
  setShowGrid: (v: boolean) => set({ showGrid: !!v }),
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
  setCursorStyle: (style: CursorStyle) => set({ cursorStyle: style }),
  setCursorColor: (color: string) => set({ cursorColor: color || '#ffffff' }),
  setCursorCooldownColor: (color: string) => set({ cursorCooldownColor: color || '#f97316' }),
  setCursorPipetteColor: (color: string) => set({ cursorPipetteColor: color || '#38bdf8' }),
  setShowCursorHints: (v: boolean) => set({ showCursorHints: !!v }),
})
