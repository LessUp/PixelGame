export const PIXEL_STORAGE_KEY = 'pixel-board-v1' as const

export type PixelStoragePayload = {
  w: number
  h: number
  b64: string
  s?: number
}

export function u8ToB64(u8: Uint8Array): string {
  let out = ''
  const CHUNK = 0x8000
  for (let i = 0; i < u8.length; i += CHUNK) {
    const sub = u8.subarray(i, i + CHUNK)
    out += String.fromCharCode.apply(null, Array.from(sub))
  }
  return btoa(out)
}

export function b64ToU8(b64: string): Uint8Array {
  const bin = atob(b64)
  const u8 = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i)
  return u8
}

export function savePixelStorage(key: string, payload: PixelStoragePayload): void {
  const json = JSON.stringify(payload)
  localStorage.setItem(key, json)
}

export function loadPixelStorage(key: string): PixelStoragePayload | null {
  const raw = localStorage.getItem(key)
  if (!raw) return null
  const obj = JSON.parse(raw) as PixelStoragePayload | null
  if (!obj || typeof obj.w !== 'number' || typeof obj.h !== 'number' || typeof obj.b64 !== 'string') {
    return null
  }
  return obj
}
