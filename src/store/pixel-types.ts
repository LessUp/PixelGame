import type { ServerMessage, PixelUpdate } from '../services/wsClient'

export type { ServerMessage, PixelUpdate }

export type Viewport = {
  scale: number
  offsetX: number
  offsetY: number
}

export type Tool = 'paint' | 'selectRect'

export type CursorStyle = 'outline' | 'crosshair'

export type HistoryItem = { idx: number; prev: number; next: number }

export type WsStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface PixelCoreState {
  width: number
  height: number
  pixels: Uint8Array
  palette: string[]
  paletteRGB: Uint8ClampedArray
  selected: number
  version: number
  dirty: number[]
  fullRedraw: boolean
  consumeDirty: () => { full: boolean; list: number[] }
}

export interface PixelViewportState {
  viewport: Viewport
  canvasW: number
  canvasH: number
  setCanvasSize: (w: number, h: number) => void
  setViewport: (v: Partial<Viewport>) => void
  panBy: (dx: number, dy: number) => void
  setScale: (scale: number, anchor?: { x: number; y: number }) => void
  centerOn: (x: number, y: number) => void
}

export interface PixelHistoryState {
  history: HistoryItem[]
  historyLimit: number
  undo: () => void
  setHistoryLimit: (n: number) => void
}

export interface PixelToolsState {
  cooldownMs: number
  lastPlacedAt: number
  tool: Tool
  selection: { x0: number; y0: number; x1: number; y1: number } | null
  setTool: (t: Tool) => void
  startSelection: (x: number, y: number) => void
  updateSelection: (x: number, y: number) => void
  clearSelection: () => void
  fillSelection: (colorIndex?: number) => number
  getPixel: (x: number, y: number) => number
  canPlace: () => boolean
  placePixel: (x: number, y: number, colorIndex?: number) => boolean
  pickColor: (x: number, y: number) => void
  setSelected: (i: number) => void
}

export interface PixelUiPrefsState {
  showGrid: boolean
  setShowGrid: (v: boolean) => void
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

export interface PixelSharingState {
  save: () => void
  load: () => void
  clear: () => void
  exportPNG: () => string
  exportJSON: () => string
  importJSON: (text: string) => boolean
  exportHash: () => string
  applyHash: (hash: string) => boolean
}

export interface PixelNetworkState {
  wsEnabled: boolean
  wsUrl: string
  wsStatus: WsStatus
  wsError: string | null
  wsLastHeartbeat: number | null
  setWsUrl: (url: string) => void
  connectWS: (url?: string) => void
  disconnectWS: () => void
  applyRemotePixels: (payload: ServerMessage | PixelUpdate[] | null | undefined) => void
  authoritativeMode: boolean
  setAuthoritativeMode: (v: boolean) => void
  pendingOps: { idx: number; prev: number }[]
}

export type PixelStore = PixelCoreState &
  PixelViewportState &
  PixelHistoryState &
  PixelToolsState &
  PixelUiPrefsState &
  PixelSharingState &
  PixelNetworkState
