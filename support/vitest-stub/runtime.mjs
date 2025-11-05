import { inspect, isDeepStrictEqual } from 'node:util'

class AssertionError extends Error {
  constructor(message) {
    super(message)
    this.name = 'AssertionError'
  }
}

const suites = []
let currentSuite = null

const state = {
  mocks: [],
}

function ensureSuite() {
  if (!currentSuite) throw new Error('Tests must be declared within describe()')
}

function describe(name, fn) {
  const suite = {
    name,
    tests: [],
    beforeEach: [],
    afterAll: [],
    children: [],
    parent: currentSuite,
  }
  if (currentSuite) currentSuite.children.push(suite)
  else suites.push(suite)
  const prev = currentSuite
  currentSuite = suite
  try {
    fn()
  } finally {
    currentSuite = prev
  }
}

function it(name, fn) {
  ensureSuite()
  currentSuite.tests.push({ name, fn })
}

function test(name, fn) {
  it(name, fn)
}

function beforeEach(fn) {
  ensureSuite()
  currentSuite.beforeEach.push(fn)
}

function afterAll(fn) {
  ensureSuite()
  currentSuite.afterAll.push(fn)
}

function formatValue(value) {
  return typeof value === 'string' ? `"${value}"` : inspect(value, { depth: 4 })
}

function createExpect(actual) {
  return {
    toBe(expected) {
      if (!Object.is(actual, expected)) {
        throw new AssertionError(`Expected ${formatValue(actual)} to be ${formatValue(expected)}`)
      }
    },
    toEqual(expected) {
      if (!isDeepStrictEqual(actual, expected)) {
        throw new AssertionError(`Expected ${formatValue(actual)} to equal ${formatValue(expected)}`)
      }
    },
    toMatchObject(expected) {
      const subset = { ...expected }
      for (const key of Object.keys(expected)) {
        if (!isDeepStrictEqual(actual[key], expected[key])) {
          throw new AssertionError(`Expected property ${key} to equal ${formatValue(expected[key])}, received ${formatValue(actual[key])}`)
        }
      }
    },
    toContain(value) {
      if (typeof actual === 'string') {
        if (!actual.includes(value)) {
          throw new AssertionError(`Expected string ${formatValue(actual)} to contain ${formatValue(value)}`)
        }
      } else if (Array.isArray(actual)) {
        if (!actual.some((item) => isDeepStrictEqual(item, value))) {
          throw new AssertionError(`Expected array ${formatValue(actual)} to contain ${formatValue(value)}`)
        }
      } else {
        throw new AssertionError('toContain is only supported for arrays and strings')
      }
    },
    toHaveLength(length) {
      if (!actual || actual.length !== length) {
        throw new AssertionError(`Expected length ${length}, received ${actual?.length}`)
      }
    },
    toBeNull() {
      if (actual !== null) {
        throw new AssertionError(`Expected value to be null, received ${formatValue(actual)}`)
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new AssertionError(`Expected value to be truthy, received ${formatValue(actual)}`)
      }
    },
    toBeCloseTo(expected, precision = 2) {
      const diff = Math.abs(Number(actual) - Number(expected))
      const pass = diff < Math.pow(10, -precision) * 1.5
      if (!pass) {
        throw new AssertionError(`Expected ${formatValue(actual)} to be close to ${formatValue(expected)} with precision ${precision}`)
      }
    },
    toBeLessThan(expected) {
      if (!(Number(actual) < Number(expected))) {
        throw new AssertionError(`Expected ${formatValue(actual)} to be less than ${formatValue(expected)}`)
      }
    },
    toBeGreaterThan(expected) {
      if (!(Number(actual) > Number(expected))) {
        throw new AssertionError(`Expected ${formatValue(actual)} to be greater than ${formatValue(expected)}`)
      }
    },
    toHaveBeenCalledTimes(times) {
      const calls = actual?.mock?.calls?.length ?? 0
      if (calls !== times) {
        throw new AssertionError(`Expected spy to be called ${times} times, received ${calls}`)
      }
    },
    toHaveBeenCalled() {
      const calls = actual?.mock?.calls?.length ?? 0
      if (calls === 0) {
        throw new AssertionError('Expected spy to be called at least once')
      }
    },
    get not() {
      return {
        toBe(expected) {
          if (Object.is(actual, expected)) {
            throw new AssertionError(`Expected ${formatValue(actual)} not to be ${formatValue(expected)}`)
          }
        },
      }
    },
  }
}

const vi = {
  spyOn(target, property) {
    const original = target[property]
    if (typeof original !== 'function') {
      throw new TypeError(`Cannot spy on ${String(property)} because it is not a function`)
    }
    const calls = []
    const wrapper = function (...args) {
      calls.push(args)
      if (wrapper.__mockImpl) {
        return wrapper.__mockImpl.apply(this, args)
      }
      return original.apply(this, args)
    }
    wrapper.mock = { calls }
    wrapper.mockImplementation = (impl) => {
      wrapper.__mockImpl = impl
    }
    target[property] = wrapper
    state.mocks.push({ target, property, original })
    return wrapper
  },
  restoreAllMocks() {
    for (const { target, property, original } of state.mocks) {
      target[property] = original
    }
    state.mocks.length = 0
  },
}

function reset() {
  suites.length = 0
  state.mocks.length = 0
  currentSuite = null
}

async function runSuites({ reporter = console } = {}) {
  let passed = 0
  let failed = 0
  for (const suite of suites) {
    const suiteName = suite.name
    const hooksStack = []
    await runSuite(suite, hooksStack, reporter, suiteName)
  }
  for (const suite of suites) {
    await runAfterAll(suite)
  }
  passed = suites.reduce((acc, suite) => acc + countTests(suite, 'passed'), 0)
  failed = suites.reduce((acc, suite) => acc + countTests(suite, 'failed'), 0)
  return { passed, failed }
}

async function runSuite(suite, parentHooks, reporter, pathName) {
  const hooks = [...parentHooks, ...suite.beforeEach]
  for (const test of suite.tests) {
    let status = 'passed'
    try {
      for (const hook of hooks) {
        await hook()
      }
      await test.fn()
    } catch (err) {
      status = 'failed'
      reporter.error?.(`✖ ${pathName} › ${test.name}\n  ${err?.stack || err}`)
    }
    test.status = status
    if (status === 'passed') {
      reporter.log?.(`✓ ${pathName} › ${test.name}`)
    }
  }
  for (const child of suite.children) {
    await runSuite(child, hooks, reporter, `${pathName} › ${child.name}`)
  }
}

async function runAfterAll(suite) {
  for (const fn of suite.afterAll) {
    await fn()
  }
  for (const child of suite.children) {
    await runAfterAll(child)
  }
}

function countTests(suite, status) {
  let total = suite.tests.filter((t) => t.status === status).length
  for (const child of suite.children) {
    total += countTests(child, status)
  }
  return total
}

reset()

export { describe, it, test, beforeEach, afterAll, createExpect as expect, vi, reset, runSuites }
