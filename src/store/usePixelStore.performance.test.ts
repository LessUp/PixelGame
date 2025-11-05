import { describe, expect, it } from '../test/harness'
import { createPixelStore } from './usePixelStore'

describe('usePixelStore performance thresholds', () => {
  it('consumeDirty should stay within threshold', () => {
    const store = createPixelStore()
    const sample = Array.from({ length: 4096 }, (_, i) => i)
    const iterations = 200
    const start = performance.now()
    for (let i = 0; i < iterations; i++) {
      store.setState({ dirty: sample, fullRedraw: false })
      store.getState().consumeDirty()
    }
    const avg = (performance.now() - start) / iterations
    expect(avg).toBeLessThan(0.2)
  })

  it('full redraw path remains bounded', () => {
    const store = createPixelStore()
    const sample = Array.from({ length: 4096 }, (_, i) => i)
    const iterations = 150
    const start = performance.now()
    for (let i = 0; i < iterations; i++) {
      store.setState({ dirty: sample, fullRedraw: true })
      store.getState().consumeDirty()
    }
    const avg = (performance.now() - start) / iterations
    expect(avg).toBeLessThan(0.25)
  })
})
