export type Hook = () => void | Promise<void>

export type SuiteFn = () => void

export type TestFn = () => unknown | Promise<unknown>

export interface SpyInstance<T extends (...args: any[]) => any = (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T>
  mock: { calls: Array<Parameters<T>> }
}

export interface Expectation<T> {
  toBe(expected: T): void
  toEqual(expected: unknown): void
  toContain(expected: unknown): void
  toHaveLength(length: number): void
  toHaveBeenCalledTimes(times: number): void
  toHaveBeenCalled(): void
  toBeCloseTo(expected: number, precision?: number): void
  toMatchObject(expected: Record<string, unknown>): void
  toBeNull(): void
  toBeLessThan(expected: number): void
}

export declare const act: <T>(cb: () => T) => T
export declare const describe: (name: string, fn: SuiteFn) => void
export declare const beforeEach: (fn: Hook) => void
export declare const it: (name: string, fn: TestFn) => void
export declare const expect: <T>(value: T) => Expectation<T>

export declare const vi: {
  spyOn<T extends Record<string, any>, K extends keyof T & string>(target: T, key: K): SpyInstance<T[K] extends (...args: any[]) => any ? T[K] : never>
  restoreAllMocks(): void
}

export interface HarnessState {
  suiteStack: Array<{ name: string; beforeEach: Hook[] }>
  totals: { total: number; passed: number; failed: number }
  failures: Array<{ suite: string[]; name: string; message: string }>
  spies: Array<{ target: Record<string, any>; key: string; original: any; spy: any; calls: any[][] }>
  queue: Promise<void>
}

export declare const getHarnessState: () => HarnessState
