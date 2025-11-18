import type { StateCreator } from 'zustand'
import type { PixelStore } from './pixel-types'
import { clamp } from '../utils/math'
import { paletteToRGB } from '../utils/color'
import { encodeViewStateToHash, decodeHashToViewState } from '../utils/hash'
import { PIXEL_STORAGE_KEY, u8ToB64, b64ToU8, savePixelStorage, loadPixelStorage } from '../utils/persistence'

export const createPixelSharingSlice: StateCreator<PixelStore, [], []> = (set, get) => ({
  save: () => {
    try {
      const s = get()
      const b64 = u8ToB64(s.pixels)
      const payload = { w: s.width, h: s.height, b64, s: s.selected }
      savePixelStorage(PIXEL_STORAGE_KEY, payload)
    } catch (err) {
      if (typeof console !== 'undefined') {
        console.warn('[pixel-store] 保存像素数据失败', err)
      }
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
    return encodeViewStateToHash(obj)
  },
  applyHash: (hash: string) => {
    try {
      const obj = decodeHashToViewState(hash)
      if (!obj) return false
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
      if (typeof console !== 'undefined') {
        console.warn('[pixel-store] 解析分享链接失败', err)
      }
      return false
    }
  },
  load: () => {
    try {
      const obj = loadPixelStorage(PIXEL_STORAGE_KEY)
      if (!obj) return
      if (obj.w === get().width && obj.h === get().height && typeof obj.b64 === 'string') {
        const u8 = b64ToU8(obj.b64)
        if (u8.length === get().pixels.length) get().pixels.set(u8)
        set({
          version: get().version + 1,
          selected: typeof obj.s === 'number' ? obj.s : get().selected,
          fullRedraw: true,
          dirty: [],
        })
      }
    } catch (err) {
      if (typeof console !== 'undefined') {
        console.warn('[pixel-store] 加载像素数据失败', err)
      }
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
      data[p + 1] = pal[base + 1] ?? 0
      data[p + 2] = pal[base + 2] ?? 0
      data[p + 3] = 255
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
      if (typeof console !== 'undefined') {
        console.warn('[pixel-store] 解析分享链接失败', err)
      }
      return false
    }
  },
})
