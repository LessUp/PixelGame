const g = globalThis as typeof globalThis & {
  window?: Window & typeof globalThis
  document?: Document
  localStorage?: Storage
  btoa?: (data: string) => string
  atob?: (data: string) => string
  CanvasRenderingContext2D?: typeof CanvasRenderingContext2D
}

class MemoryStorage implements Storage {
  private map = new Map<string, string>()

  get length() {
    return this.map.size
  }

  clear(): void {
    this.map.clear()
  }

  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null
  }

  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.map.delete(key)
  }

  setItem(key: string, value: string): void {
    this.map.set(key, String(value))
  }
}

const win = (g.window ||= (globalThis as unknown as Window & typeof globalThis))

if (!win.localStorage) {
  win.localStorage = new MemoryStorage()
}

if (!g.localStorage) {
  g.localStorage = win.localStorage
}

g.btoa ||= (data: string) => Buffer.from(data, 'binary').toString('base64')
g.atob ||= (data: string) => Buffer.from(data, 'base64').toString('binary')

win.btoa = g.btoa
win.atob = g.atob

class MockCanvasRenderingContext2D {
  public lastImageData: ImageData | null = null

  createImageData(width: number, height: number): ImageData {
    return {
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
    } as ImageData
  }

  putImageData(image: ImageData, _x: number, _y: number) {
    this.lastImageData = image
  }
}

g.CanvasRenderingContext2D = MockCanvasRenderingContext2D as unknown as typeof CanvasRenderingContext2D

class MockCanvasElement {
  width = 0
  height = 0
  private ctx = new MockCanvasRenderingContext2D()

  getContext(type: string) {
    if (type === '2d') return this.ctx as unknown as CanvasRenderingContext2D
    return null
  }

  toDataURL() {
    return 'data:image/png;base64,mock'
  }
}

if (!win.HTMLCanvasElement) {
  win.HTMLCanvasElement = MockCanvasElement as unknown as typeof HTMLCanvasElement
}

const ensureCanvas = () => {
  const prototype = win.HTMLCanvasElement?.prototype
  if (!prototype) return
  const createCtx = () => new MockCanvasRenderingContext2D()
  prototype.getContext = function getContext(type: string) {
    if (type === '2d') return createCtx() as unknown as CanvasRenderingContext2D
    return null
  }
  prototype.toDataURL = function toDataURL() {
    return 'data:image/png;base64,mock'
  }
}

ensureCanvas()

const ensureDocument = () => {
  if (win.document) {
    g.document = win.document
    return
  }
  const doc = {
    createElement(tag: string) {
      if (tag.toLowerCase() === 'canvas') {
        return new (win.HTMLCanvasElement as unknown as { new (): HTMLCanvasElement })()
      }
      return { tagName: tag.toUpperCase() }
    },
  } as unknown as Document
  win.document = doc
  g.document = doc
}

ensureDocument()

if (!win.requestAnimationFrame) {
  win.requestAnimationFrame = (cb: FrameRequestCallback) =>
    Number(setTimeout(() => cb(performance.now()), 16))
}

if (!win.cancelAnimationFrame) {
  win.cancelAnimationFrame = (id: number) => {
    clearTimeout(id)
  }
}

win.performance = win.performance || g.performance

if (!win.navigator) {
  Object.defineProperty(win, 'navigator', {
    configurable: true,
    writable: true,
    value: { userAgent: 'vitest-jsdom' },
  })
} else if (!('userAgent' in win.navigator)) {
  try {
    ;(win.navigator as Navigator & { userAgent?: string }).userAgent = 'vitest-jsdom'
  } catch {
    Object.defineProperty(win, 'navigator', {
      configurable: true,
      writable: true,
      value: { ...win.navigator, userAgent: 'vitest-jsdom' },
    })
  }
}

if (!g.navigator) {
  g.navigator = win.navigator
}

export {}
