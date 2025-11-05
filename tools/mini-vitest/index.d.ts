export type TestFn = () => void | Promise<void>
export type SuiteFn = () => void

export interface MockResult<T> {
  type: 'return' | 'throw'
  value: T | unknown
}

export interface Mock<TArgs extends unknown[] = unknown[], TResult = unknown> {
  (...args: TArgs): TResult
  mock: {
    calls: TArgs[]
    results: MockResult<TResult>[]
  }
  mockImplementation(fn: (...args: TArgs) => TResult): Mock<TArgs, TResult>
  mockReset(): void
  mockClear(): void
}

export const vi: {
  fn<TArgs extends unknown[] = unknown[], TResult = unknown>(impl?: (...args: TArgs) => TResult): Mock<TArgs, TResult>
  clearAllMocks(): void
  stubGlobal(name: string, value: unknown): void
}

export interface Expectation<T> {
  toBe(value: T): void
  toEqual(value: unknown): void
  toBeNull(): void
  toBeTruthy(): void
  toBeCloseTo(value: number, precision?: number): void
  toContain(value: unknown): void
  toHaveBeenCalled(): void
  toHaveBeenCalledWith(...args: unknown[]): void
}

export function expect<T>(value: T): Expectation<T>

export function defineConfig<T>(config: T): T

export function beforeEach(fn: TestFn): void
export function it(name: string, fn: TestFn): void
export function test(name: string, fn: TestFn): void
export namespace describe {
  function skip(name: string, fn: SuiteFn): void
  function only(name: string, fn: SuiteFn): void
}
export function describe(name: string, fn: SuiteFn): void

export function bench(name: string, fn: TestFn): void

export interface RunStats {
  total: number
  failed: number
}

export function resetSuites(): void
export function runSuites(): Promise<RunStats>
export function runBenchmarks(): Promise<Array<{ name: string; hz: number; duration: number }>>
