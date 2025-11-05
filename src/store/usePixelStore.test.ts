import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPixelStore } from './usePixelStore'
import wsClient from '../services/wsClient'

const createWsMock = () => ({
  connect: vi.fn<[string, unknown?], boolean>(() => true),
  disconnect: vi.fn<[], void>(() => {}),
  sendPlacePixel: vi.fn<[number, number, number], boolean>(() => true),
  sendFillRect: vi.fn<[number, number, number, number, number], boolean>(() => true),
})

describe('usePixelStore', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('places pixels and supports undo history', () => {
    const ws = createWsMock()
    const store = createPixelStore({ wsClient: ws as unknown as typeof wsClient })
    const api = store.getState()
    const idx = 10 * api.width + 12

    expect(api.placePixel(12, 10, 5)).toBe(true)
    expect(store.getState().pixels[idx]).toBe(5)
    expect(ws.sendPlacePixel).toHaveBeenCalledWith(12, 10, 5)

    const dirty = store.getState().consumeDirty()
    expect(dirty.full).toBe(true)
    expect(dirty.list).toContain(idx)

    store.getState().undo()
    expect(store.getState().pixels[idx]).toBe(0)
  })

  it('fills selection areas and clears selection state', () => {
    const ws = createWsMock()
    const store = createPixelStore({ wsClient: ws as unknown as typeof wsClient })
    const api = store.getState()
    api.startSelection(2, 2)
    api.updateSelection(4, 3)

    const filled = api.fillSelection(7)
    expect(filled).toBe(6)
    expect(store.getState().selection).toBeNull()

    const idx = (2 * api.width) + 2
    expect(store.getState().pixels[idx]).toBe(7)
    expect(ws.sendFillRect).toHaveBeenCalledWith(2, 2, 4, 3, 7)
  })

  it('exports and applies hash state', () => {
    const store = createPixelStore()
    const api = store.getState()
    api.setViewport({ scale: 12, offsetX: 42, offsetY: 24 })
    api.setShowGrid(true)
    api.setGridColor('#ff00ff')
    api.setGridAlpha(0.4)
    api.setGridMinScale(4)

    const hash = api.exportHash()
    expect(hash.startsWith('#pb=')).toBe(true)

    const other = createPixelStore()
    expect(other.getState().applyHash(hash)).toBe(true)
    const applied = other.getState()
    expect(applied.viewport.scale).toBe(12)
    expect(applied.viewport.offsetX).toBe(42)
    expect(applied.showGrid).toBe(true)
    expect(applied.gridColor).toBe('#ff00ff')
    expect(applied.gridAlpha).toBeCloseTo(0.4)
    expect(applied.gridMinScale).toBe(4)
  })

  it('exports and imports JSON payloads', () => {
    const store = createPixelStore()
    const api = store.getState()
    api.placePixel(1, 1, 3)
    const json = api.exportJSON()

    const other = createPixelStore()
    expect(other.getState().importJSON(json)).toBe(true)
    expect(other.getState().getPixel(1, 1)).toBe(3)
  })

  it('applies remote pixel batches', () => {
    const store = createPixelStore()
    store.getState().applyRemotePixels([{ x: 5, y: 6, c: 9 }])
    expect(store.getState().getPixel(5, 6)).toBe(9)
  })

  it('connects and disconnects websocket via adapter', () => {
    const ws = createWsMock()
    const store = createPixelStore({ wsClient: ws as unknown as typeof wsClient })
    const api = store.getState()

    api.connectWS('wss://example.test/ws')
    expect(ws.connect).toHaveBeenCalled()
    const [target, options] = ws.connect.mock.calls[0]
    expect(target).toBe('wss://example.test/ws')
    expect(typeof options).toBe('object')

    api.disconnectWS()
    expect(ws.disconnect).toHaveBeenCalled()
  })
})
