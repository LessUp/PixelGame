import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'

const createSuite = (name, parent = null) => ({
  name,
  parent,
  tests: [],
  suites: [],
  beforeEach: [],
  benchmarks: [],
})

let rootSuite = createSuite('root')
let currentSuite = rootSuite
const suiteStack = [rootSuite]
const mocks = new Set()

export const vi = {
  fn(impl = () => undefined) {
    let implementation = impl
    const mock = function (...args) {
      mock.mock.calls.push(args)
      try {
        const result = implementation.apply(this, args)
        mock.mock.results.push({ type: 'return', value: result })
        return result
      } catch (error) {
        mock.mock.results.push({ type: 'throw', value: error })
        throw error
      }
    }
    mock.mock = {
      calls: [],
      results: [],
    }
    mock.mockImplementation = (fn) => {
      implementation = fn
      return mock
    }
    mock.mockReset = () => {
      mock.mock.calls = []
      mock.mock.results = []
    }
    mock.mockClear = mock.mockReset
    mocks.add(mock)
    return mock
  },
  clearAllMocks() {
    for (const mock of mocks) {
      if (mock && mock.mock) {
        mock.mock.calls = []
        mock.mock.results = []
      }
    }
  },
  stubGlobal(name, value) {
    globalThis[name] = value
  },
}

export const expect = (received) => ({
  toBe(expected) {
    assert.strictEqual(received, expected)
  },
  toEqual(expected) {
    assert.deepStrictEqual(received, expected)
  },
  toBeNull() {
    assert.strictEqual(received, null)
  },
  toBeTruthy() {
    assert.ok(received)
  },
  toBeCloseTo(expected, precision = 2) {
    const delta = Math.pow(10, -precision) / 2
    assert.ok(Math.abs(received - expected) < delta, `Expected ${received} to be within ${delta} of ${expected}`)
  },
  toContain(expected) {
    assert.ok(received && typeof received.includes === 'function' && received.includes(expected), `${received} does not contain ${expected}`)
  },
  toHaveBeenCalled() {
    assert.ok(received && received.mock && received.mock.calls.length > 0, 'Expected mock to have been called')
  },
  toHaveBeenCalledWith(...args) {
    assert.ok(received && received.mock, 'Received value is not a mock function')
    const found = received.mock.calls.some(call => assert.deepStrictEqual(call, args) === undefined)
    if (!found) {
      throw new assert.AssertionError({ message: `Expected mock to be called with ${JSON.stringify(args)}` })
    }
  },
})

export const defineConfig = (config) => config

export const beforeEach = (fn) => {
  currentSuite.beforeEach.push(fn)
}

export const it = (name, fn) => {
  currentSuite.tests.push({ name, fn, parent: currentSuite })
}

export const test = it

export const describe = (name, fn) => {
  const parent = currentSuite
  const suite = createSuite(name, parent)
  parent.suites.push(suite)
  suiteStack.push(suite)
  currentSuite = suite
  try {
    fn()
  } finally {
    suiteStack.pop()
    currentSuite = suiteStack[suiteStack.length - 1]
  }
}

describe.skip = () => {}
describe.only = (name, fn) => {
  rootSuite = createSuite('root')
  currentSuite = rootSuite
  suiteStack.length = 0
  suiteStack.push(rootSuite)
  describe(name, fn)
}

export const bench = (name, fn) => {
  currentSuite.benchmarks.push({ name, fn, parent: currentSuite })
}

const collectSuites = (suite, parents = []) => {
  const results = []
  const names = suite.name === 'root' ? parents : [...parents, suite.name]
  for (const test of suite.tests) {
    results.push({ type: 'test', names, test })
  }
  for (const bench of suite.benchmarks) {
    results.push({ type: 'bench', names, bench })
  }
  for (const child of suite.suites) {
    results.push(...collectSuites(child, names))
  }
  return results
}

const runHooks = async (hooks) => {
  for (const hook of hooks) {
    await hook()
  }
}

const collectHooks = (suite) => {
  const hooks = []
  let ptr = suite
  while (ptr) {
    hooks.unshift(...ptr.beforeEach)
    ptr = ptr.parent
  }
  return hooks
}

export const resetSuites = () => {
  rootSuite = createSuite('root')
  currentSuite = rootSuite
  suiteStack.length = 0
  suiteStack.push(rootSuite)
  mocks.clear()
}

export const runSuites = async () => {
  const entries = collectSuites(rootSuite)
  const tests = entries.filter(entry => entry.type === 'test')
  let failures = 0
  for (const entry of tests) {
    const hooks = collectHooks(entry.test.parent)
    const name = [...entry.names, entry.test.name].filter(Boolean).join(' > ')
    try {
      await runHooks(hooks)
      await entry.test.fn()
      console.log(`\x1b[32m✓\x1b[0m ${name}`)
    } catch (error) {
      failures += 1
      console.error(`\x1b[31m✗ ${name}\x1b[0m`)
      console.error(error)
    }
  }
  return { total: tests.length, failed: failures }
}

const gatherBenchmarks = (suite, parents = []) => {
  const names = suite.name === 'root' ? parents : [...parents, suite.name]
  let tasks = suite.benchmarks.map(bench => ({ names, bench }))
  for (const child of suite.suites) {
    tasks = tasks.concat(gatherBenchmarks(child, names))
  }
  return tasks
}

export const runBenchmarks = async () => {
  const tasks = gatherBenchmarks(rootSuite)
  if (!tasks.length) {
    console.log('No benchmarks registered.')
    return []
  }
  const results = []
  for (const task of tasks) {
    const name = [...task.names, task.bench.name].filter(Boolean).join(' > ')
    const iterations = 50
    const start = performance.now()
    for (let i = 0; i < iterations; i++) {
      await task.bench.fn()
    }
    const duration = (performance.now() - start) / iterations
    const hz = 1000 / duration
    results.push({ name, hz, duration })
    console.log(`⚙ ${name}: ${hz.toFixed(2)} ops/s (${duration.toFixed(3)} ms/op)`)
  }
  return results
}

export const getRootSuite = () => rootSuite

