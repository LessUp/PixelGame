import { bench, describe } from 'vitest'
import { createPixelStore } from '../src/store/usePixelStore'

describe('pixel store hot paths', () => {
  bench('fillSelection 16x16 area', () => {
    const store = createPixelStore()
    const api = store.getState()
    api.startSelection(10, 10)
    api.updateSelection(25, 25)
    api.fillSelection(4)
  })

  bench('consumeDirty after writes', () => {
    const store = createPixelStore()
    const api = store.getState()
    api.startSelection(0, 0)
    api.updateSelection(31, 31)
    api.fillSelection(2)
    api.consumeDirty()
  })
})
