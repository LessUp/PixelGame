const harness = (globalThis.__pixelHarness ||= {
  suiteStack: [],
  totals: { total: 0, passed: 0, failed: 0 },
  failures: [],
  spies: [],
  queue: Promise.resolve(),
})

const indent = (depth) => '  '.repeat(Math.max(0, depth))

export const act = (cb) => cb()

export const describe = (name, fn) => {
  const depth = harness.suiteStack.length
  console.log(`${indent(depth)}${name}`)
  const ctx = { name, beforeEach: [] }
  harness.suiteStack.push(ctx)
  try {
    fn()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`${indent(depth + 1)}✗ describe threw: ${message}`)
    harness.failures.push({ suite: harness.suiteStack.map((s) => s.name), name: '(suite setup)', message })
  } finally {
    harness.suiteStack.pop()
  }
}

export const beforeEach = (fn) => {
  const current = harness.suiteStack.at(-1)
  if (!current) throw new Error('beforeEach called outside of describe')
  current.beforeEach.push(fn)
}

const runHooks = async (contexts) => {
  for (const ctx of contexts) {
    for (const hook of ctx.beforeEach) {
      await hook()
    }
  }
}

const formatError = (error, depth) => {
  if (error instanceof Error) {
    const stack = error.stack ? `\n${indent(depth)}${error.stack}` : ''
    return `${indent(depth)}${error.message}${stack}`
  }
  return `${indent(depth)}${String(error)}`
}

export const it = (name, fn) => {
  const contexts = harness.suiteStack.map((ctx) => ({
    name: ctx.name,
    beforeEach: [...ctx.beforeEach],
  }))
  const depth = contexts.length
  const suites = contexts.map((s) => s.name)
  console.log(`${indent(depth)}• ${name}`)
  const run = async () => {
    harness.totals.total += 1
    try {
      await runHooks(contexts)
      await fn()
      harness.totals.passed += 1
      console.log(`${indent(depth)}✓ ${name}`)
    } catch (error) {
      harness.totals.failed += 1
      const message = formatError(error, depth + 1)
      console.error(`${indent(depth)}✗ ${name}`)
      console.error(message)
      harness.failures.push({ suite: suites, name, message })
    } finally {
      restoreSpies()
    }
  }

  harness.queue = harness.queue.catch(() => undefined).then(run).then(() => undefined, () => undefined)
}

const restoreSpies = () => {
  for (const record of harness.spies.splice(0)) {
    record.target[record.key] = record.original
    record.calls.length = 0
  }
}

const formatValue = (value) => {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

class Expectation {
  constructor(actual) {
    this.actual = actual
  }

  toBe(expected) {
    if (!Object.is(this.actual, expected)) {
      throw new Error(`Expected ${formatValue(this.actual)} to be ${formatValue(expected)}`)
    }
  }

  toEqual(expected) {
    if (!isDeepEqual(this.actual, expected)) {
      throw new Error(`Expected ${formatValue(this.actual)} to equal ${formatValue(expected)}`)
    }
  }

  toContain(expected) {
    const container = this.actual
    if (typeof container?.includes !== 'function') {
      throw new Error('Actual value does not support contains check')
    }
    if (!container.includes(expected)) {
      throw new Error(`Expected ${formatValue(this.actual)} to contain ${formatValue(expected)}`)
    }
  }

  toHaveLength(length) {
    const actualLength = this.actual?.length
    if (actualLength !== length) {
      throw new Error(`Expected length ${length} but received ${actualLength}`)
    }
  }

  toHaveBeenCalledTimes(times) {
    const calls = this.actual?.mock?.calls
    if (!Array.isArray(calls)) throw new Error('Value is not a spy')
    if (calls.length !== times) {
      throw new Error(`Expected ${times} calls but received ${calls.length}`)
    }
  }

  toHaveBeenCalled() {
    const calls = this.actual?.mock?.calls
    if (!Array.isArray(calls)) throw new Error('Value is not a spy')
    if (calls.length === 0) throw new Error('Expected spy to have been called')
  }

  toBeCloseTo(expected, precision = 2) {
    const actualNumber = Number(this.actual)
    if (!Number.isFinite(actualNumber)) throw new Error('Actual value is not a number')
    const delta = Math.pow(10, -precision) / 2
    if (Math.abs(actualNumber - expected) > delta) {
      throw new Error(`Expected ${actualNumber} to be close to ${expected}`)
    }
  }

  toMatchObject(expected) {
    if (typeof this.actual !== 'object' || this.actual === null) {
      throw new Error('Actual value is not an object')
    }
    for (const [key, value] of Object.entries(expected)) {
      if (!isDeepEqual(this.actual[key], value)) {
        throw new Error(`Expected property ${key} to match ${formatValue(value)}, received ${formatValue(this.actual[key])}`)
      }
    }
  }

  toBeNull() {
    if (this.actual !== null) {
      throw new Error(`Expected value to be null but was ${formatValue(this.actual)}`)
    }
  }

  toBeLessThan(expected) {
    const actualNumber = Number(this.actual)
    if (!(actualNumber < expected)) {
      throw new Error(`Expected ${actualNumber} to be less than ${expected}`)
    }
  }
}

const isDeepEqual = (a, b) => {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const keysA = Reflect.ownKeys(a)
  const keysB = Reflect.ownKeys(b)
  if (keysA.length !== keysB.length) return false
  for (const key of keysA) {
    if (!isDeepEqual(a[key], b[key])) return false
  }
  return true
}

export const expect = (value) => new Expectation(value)

const createSpy = (target, key) => {
  const original = target[key]
  if (typeof original !== 'function') {
    throw new Error(`Cannot spy on property ${String(key)}`)
  }
  const calls = []
  const spy = function (...args) {
    calls.push(args)
    return original.apply(this, args)
  }
  spy.mock = { calls }
  harness.spies.push({ target, key, original, spy, calls })
  target[key] = spy
  return spy
}

export const vi = {
  spyOn(target, key) {
    return createSpy(target, key)
  },
  restoreAllMocks() {
    restoreSpies()
  },
}

export const getHarnessState = () => harness
