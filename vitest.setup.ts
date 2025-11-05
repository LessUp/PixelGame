type StorageRecord = Record<string, string>

class MemoryStorage implements Storage {
  private map: StorageRecord = {}
  get length() {
    return Object.keys(this.map).length
  }
  clear(): void {
    this.map = {}
  }
  getItem(key: string): string | null {
    return Object.prototype.hasOwnProperty.call(this.map, key) ? this.map[key] : null
  }
  key(index: number): string | null {
    const keys = Object.keys(this.map)
    return keys[index] ?? null
  }
  removeItem(key: string): void {
    delete this.map[key]
  }
  setItem(key: string, value: string): void {
    this.map[key] = String(value)
  }
}

const g = globalThis as typeof globalThis & {
  window?: Window & typeof globalThis
  document?: Document
  localStorage?: Storage
  btoa?: (data: string) => string
  atob?: (data: string) => string
  CanvasRenderingContext2D?: typeof CanvasRenderingContext2D
}

if (!g.localStorage) {
  g.localStorage = new MemoryStorage()
}

g.window = Object.assign(Object.create(null), g.window, {
  localStorage: g.localStorage,
}) as Window & typeof globalThis

g.window.window = g.window

g.btoa ||= (data: string) => Buffer.from(data, 'binary').toString('base64')

g.atob ||= (data: string) => Buffer.from(data, 'base64').toString('binary')

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

class MockCanvasElement {
  width = 0
  height = 0
  private ctx = new MockCanvasRenderingContext2D()
  getContext(type: string) {
    if (type === '2d') return this.ctx
    return null
  }
  toDataURL(_type?: string) {
    return 'data:image/png;base64,mock'
  }
}

g.CanvasRenderingContext2D = MockCanvasRenderingContext2D as unknown as typeof CanvasRenderingContext2D

class MockDocument {
  createElement(tagName: string) {
    if (tagName.toLowerCase() === 'canvas') {
      return new MockCanvasElement() as unknown as HTMLCanvasElement
    }
    return {
      tagName: tagName.toUpperCase(),
      style: {},
    }
  }
}

g.document = g.document || (new MockDocument() as unknown as Document)

g.window.document = g.document

g.window.CanvasRenderingContext2D = g.CanvasRenderingContext2D

g.window.btoa = g.btoa

g.window.atob = g.atob

g.window.performance = g.performance

g.window.navigator = g.navigator ?? ({ userAgent: 'vitest-mini-dom' } as Navigator)

g.window.requestAnimationFrame ||= (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 16)

g.window.cancelAnimationFrame ||= (id: number) => clearTimeout(id)

export type {}
