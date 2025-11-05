import { act, beforeEach, describe, expect, it, vi } from '../test/harness'
import { createPixelStore } from './usePixelStore'

describe('usePixelStore core actions', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('placePixel updates pixels, history and dirty set', () => {
    const store = createPixelStore()
    const spy = vi.spyOn(window.localStorage, 'setItem')
    store.setState({ cooldownMs: 0 })

    let result = false
    act(() => {
      result = store.getState().placePixel(2, 3, 5)
    })

    const idx = 3 * store.getState().width + 2
    expect(result).toBe(true)
    expect(store.getState().pixels[idx]).toBe(5)
    expect(store.getState().history).toHaveLength(1)
    expect(store.getState().dirty).toContain(idx)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('fillSelection paints area and clears selection', () => {
    const store = createPixelStore()
    const spy = vi.spyOn(window.localStorage, 'setItem')
    store.setState({ cooldownMs: 0 })

    act(() => {
      store.getState().startSelection(0, 0)
      store.getState().updateSelection(1, 1)
    })

    store.setState({ selected: 7 })

    let changed = 0
    act(() => {
      changed = store.getState().fillSelection() ?? 0
    })

    expect(changed).toBe(4)
    const idx = store.getState().width + 1
    expect(store.getState().pixels[idx]).toBe(7)
    expect(store.getState().history).toHaveLength(4)
    expect(store.getState().dirty.length).toBe(4)
    expect(store.getState().selection).toBeNull()
    expect(spy).toHaveBeenCalled()
  })

  it('undo restores previous pixel value', () => {
    const store = createPixelStore()
    vi.spyOn(window.localStorage, 'setItem')
    store.setState({ cooldownMs: 0 })

    const idx = store.getState().width + 1

    act(() => {
      store.getState().placePixel(1, 1, 6)
    })

    expect(store.getState().pixels[idx]).toBe(6)
    act(() => {
      store.getState().undo()
    })

    expect(store.getState().pixels[idx]).toBe(0)
    expect(store.getState().history).toHaveLength(0)
  })

  it('exportHash/applyHash round-trip view options', () => {
    const store = createPixelStore()
    store.setState({
      viewport: { scale: 4, offsetX: 42, offsetY: -18 },
      selected: 9,
      showGrid: true,
      gridColor: '#123456',
      gridAlpha: 0.5,
      gridMinScale: 16,
    })

    const hash = store.getState().exportHash()
    expect(hash.startsWith('#pb=')).toBe(true)

    const next = createPixelStore()
    let applied = false
    act(() => {
      applied = next.getState().applyHash(hash)
    })

    expect(applied).toBe(true)
    const state = next.getState()
    expect(state.viewport).toMatchObject({ scale: 4, offsetX: 42, offsetY: -18 })
    expect(state.selected).toBe(9)
    expect(state.showGrid).toBe(true)
    expect(state.gridColor).toBe('#123456')
    expect(state.gridAlpha).toBeCloseTo(0.5)
    expect(state.gridMinScale).toBe(16)
  })

  it('exportJSON/importJSON keep pixel buffer and palette', () => {
    const store = createPixelStore()
    vi.spyOn(window.localStorage, 'setItem')
    const [idx0, idx1] = [0, 123]
    store.getState().pixels[idx0] = 12
    store.getState().pixels[idx1] = 3

    const exported = store.getState().exportJSON()
    const parsed = JSON.parse(exported)
    expect(parsed.w).toBe(store.getState().width)
    expect(parsed.h).toBe(store.getState().height)
    expect(parsed.palette).toEqual(store.getState().palette)

    const restored = createPixelStore()
    let imported = false
    act(() => {
      imported = restored.getState().importJSON(exported)
    })

    expect(imported).toBe(true)
    expect(restored.getState().pixels[idx0]).toBe(12)
    expect(restored.getState().pixels[idx1]).toBe(3)
  })

  it('exportPNG uses mocked canvas rendering pipeline', () => {
    const store = createPixelStore()
    store.getState().pixels[0] = 1
    const dataUrl = store.getState().exportPNG()
    expect(dataUrl).toBe('data:image/png;base64,mock')
  })
})
