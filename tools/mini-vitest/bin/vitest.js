#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import { resetSuites, runSuites, runBenchmarks } from '../index.js'

const root = process.cwd()

const args = process.argv.slice(2)
let mode = 'test'
if (args[0] === 'bench') {
  mode = 'bench'
  args.shift()
} else if (args[0] === 'run') {
  args.shift()
}

const ensureDomEnvironment = () => {
  if (globalThis.window) return
  const setGlobal = (key, value) => {
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
    })
  }
  const storage = new Map()
  const localStorage = {
    getItem: (key) => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => { storage.set(key, String(value)) },
    removeItem: (key) => { storage.delete(key) },
    clear: () => { storage.clear() },
  }
  const createCanvas = () => ({
    width: 0,
    height: 0,
    getContext: () => ({
      createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
      putImageData: () => {},
      fillRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      scale: () => {},
      clearRect: () => {},
      drawImage: () => {},
      setTransform: () => {},
    }),
    toDataURL: () => 'data:image/png;base64,mock',
  })
  if (!globalThis.ImageData) {
    globalThis.ImageData = class ImageDataPolyfill {
      constructor(width, height) {
        this.width = width
        this.height = height
        this.data = new Uint8ClampedArray(width * height * 4)
      }
    }
  }
  const document = {
    createElement: (tag) => {
      if (tag === 'canvas') return createCanvas()
      return { tagName: String(tag).toUpperCase() }
    },
    body: {},
  }
  const navigator = {
    clipboard: {
      writeText: async () => {},
    },
  }
  const location = {
    origin: 'http://localhost',
    pathname: '/',
    hash: '',
    assign: () => {},
    replace: () => {},
    reload: () => {},
  }
  const windowObj = {
    document,
    navigator,
    localStorage,
    devicePixelRatio: 1,
    addEventListener: () => {},
    removeEventListener: () => {},
    location,
  }
  document.defaultView = windowObj
  setGlobal('window', windowObj)
  setGlobal('document', document)
  setGlobal('localStorage', localStorage)
  setGlobal('navigator', navigator)
  setGlobal('location', location)
}

const walk = (dir, predicate, out = []) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full, predicate, out)
    } else if (predicate(full)) {
      out.push(full)
    }
  }
  return out
}

const importModule = async (filePath) => {
  const result = await build({
    entryPoints: [filePath],
    bundle: true,
    platform: 'node',
    format: 'esm',
    sourcemap: 'inline',
    write: false,
    absWorkingDir: root,
    target: 'es2020',
    external: ['vitest', 'vitest/config'],
  })
  const code = result.outputFiles[0].text
  const tmpRoot = path.join(root, 'node_modules/.tmp')
  fs.mkdirSync(tmpRoot, { recursive: true })
  const tempDir = fs.mkdtempSync(path.join(tmpRoot, 'vitest-'))
  const tempFile = path.join(tempDir, 'entry.mjs')
  fs.writeFileSync(tempFile, code, 'utf8')
  const module = await import(pathToFileURL(tempFile).href)
  fs.rmSync(tempDir, { recursive: true, force: true })
  return module
}

const loadConfig = async () => {
  const configPath = path.join(root, 'vitest.config.ts')
  if (!fs.existsSync(configPath)) return {}
  const mod = await importModule(configPath)
  return mod.default ?? mod
}

const loadSetupFiles = async (config) => {
  const setup = config?.test?.setupFiles ?? []
  const files = Array.isArray(setup) ? setup : [setup]
  for (const file of files) {
    if (!file) continue
    const resolved = path.resolve(root, file)
    if (fs.existsSync(resolved)) {
      await importModule(resolved)
    }
  }
}

const main = async () => {
  ensureDomEnvironment()
  const config = await loadConfig()
  await loadSetupFiles(config)

  const predicate = mode === 'bench'
    ? (file) => file.endsWith('.bench.ts') || file.endsWith('.bench.tsx')
    : (file) => file.endsWith('.test.ts') || file.endsWith('.test.tsx')

  const searchRoot = mode === 'bench' ? path.join(root, 'bench') : path.join(root, 'src')
  const files = fs.existsSync(searchRoot) ? walk(searchRoot, predicate) : []

  if (!files.length) {
    console.log(mode === 'bench' ? 'No benchmark files found.' : 'No test files found.')
    return
  }

  let total = 0
  let failed = 0

  for (const file of files) {
    resetSuites()
    await importModule(file)
    if (mode === 'bench') {
      await runBenchmarks()
    } else {
      const stats = await runSuites()
      total += stats.total
      failed += stats.failed
    }
  }

  if (mode !== 'bench') {
    console.log(`Total: ${total}, Failed: ${failed}`)
    if (failed > 0) {
      process.exitCode = 1
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
