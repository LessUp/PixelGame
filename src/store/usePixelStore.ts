import { create, type StateCreator } from 'zustand'
import { createStore } from 'zustand/vanilla'
import wsClient from '../services/wsClient'
import { createPixelUiPrefsSlice } from './pixel-ui-prefs.slice'
import { createPixelViewportSlice } from './pixel-viewport.slice'
import { createPixelCoreSlice } from './pixel-core.slice'
import { createPixelHistorySlice } from './pixel-history.slice'
import { createPixelToolsSlice } from './pixel-tools.slice'
import { createPixelNetworkSlice } from './pixel-network.slice'
import { createPixelSharingSlice } from './pixel-sharing.slice'
import type {
  PixelStore as PixelStoreShape,
  Viewport,
  Tool,
  CursorStyle,
  HistoryItem,
  ServerMessage,
  PixelUpdate
} from './pixel-types'

export type PixelStore = PixelStoreShape & {
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
export const defaultPalette: string[] = [
  '#000000','#FFFFFF','#FF0000','#00FF00','#0000FF','#FFFF00','#FF00FF','#00FFFF',
  '#808080','#800000','#808000','#008000','#800080','#008080','#000080','#C0C0C0',
  '#FFA500','#A52A2A','#8B4513','#2E8B57','#228B22','#3CB371','#66CDAA','#20B2AA',
  '#5F9EA0','#4682B4','#1E90FF','#6495ED','#7B68EE','#EE82EE','#FFC0CB','#FFD700'
]

type PixelStoreDeps = {
  wsClient?: typeof wsClient
}

const createPixelStoreState = (socket: typeof wsClient): StateCreator<PixelStore, [], []> => (set, get, store) => {
  const width = 1024
  const height = 1024
  const pixels = new Uint8Array(width * height)

  return {
    ...createPixelCoreSlice(width, height, pixels, defaultPalette)(set, get, store),
    ...createPixelHistorySlice(set, get, store),
    ...createPixelToolsSlice(socket)(set, get, store),
    ...createPixelNetworkSlice(socket)(set, get, store),
    ...createPixelSharingSlice(set, get, store),
    ...createPixelViewportSlice(set, get, store),
    ...createPixelUiPrefsSlice(set, get, store),
  }
}

export const createPixelStore = (deps: PixelStoreDeps = {}) =>
  createStore<PixelStore>(createPixelStoreState(deps.wsClient ?? wsClient))

export const usePixelStore = create<PixelStore>(createPixelStoreState(wsClient))

export default usePixelStore
