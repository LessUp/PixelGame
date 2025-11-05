import { vi } from 'vitest'

class MockCanvasRenderingContext2D {
  createImageData(width: number, height: number) {
    return new ImageData(width, height)
  }
  putImageData() {}
  fillRect() {}
  beginPath() {}
  moveTo() {}
  lineTo() {}
  stroke() {}
  save() {}
  restore() {}
  translate() {}
  scale() {}
  clearRect() {}
  drawImage() {}
  setTransform() {}
}

const canvasProto = window.HTMLCanvasElement?.prototype
if (canvasProto) {
  canvasProto.getContext = function getContext(type: string) {
    if (type === '2d') {
      return new MockCanvasRenderingContext2D() as unknown as CanvasRenderingContext2D
    }
    return null
  }
  canvasProto.toDataURL = () => 'data:image/png;base64,mock'
}

if (!('ResizeObserver' in globalThis)) {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
}

if (!('matchMedia' in window)) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}
