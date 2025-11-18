export const HASH_PREFIX = '#pb=' as const

export type CursorHashState = {
  style?: 'outline' | 'crosshair'
  color?: string
  cooldown?: string
  pipette?: string
  hints?: boolean
}

export type ViewHashState = {
  v: number
  vp?: { scale: number; offsetX: number; offsetY: number }
  s?: number
  g?: boolean
  gc?: string
  ga?: number
  gs?: number
  cursor?: CursorHashState
}

export function encodeViewStateToHash(state: ViewHashState): string {
  const json = JSON.stringify(state)
  const b64 = btoa(unescape(encodeURIComponent(json)))
  return `${HASH_PREFIX}${b64}`
}

export function decodeHashToViewState(hash: string): ViewHashState | null {
  if (!hash || !hash.startsWith(HASH_PREFIX)) return null
  try {
    const b64 = hash.slice(HASH_PREFIX.length)
    const json = decodeURIComponent(escape(atob(b64)))
    const obj = JSON.parse(json)
    if (!obj || typeof obj !== 'object' || (obj as { v?: unknown }).v !== 1) return null
    return obj as ViewHashState
  } catch {
    return null
  }
}
