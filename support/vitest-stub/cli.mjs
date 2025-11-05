#!/usr/bin/env node
import { build } from 'esbuild'
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, beforeEach, describe, expect, it, reset, runSuites, test, vi } from './runtime.mjs'

async function collectTestFiles(rootDir) {
  const files = []
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(full)
      } else if (/\.test\.ts$/.test(entry.name)) {
        files.push(full)
      }
    }
  }
  await walk(rootDir)
  return files
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true })
}

async function run() {
  const root = process.cwd()
  const args = process.argv.slice(2).filter((arg) => arg !== 'run')
  const filter = args.length ? args : null
  const tests = await collectTestFiles(path.join(root, 'src'))
  const targetTests = filter ? tests.filter((file) => filter.some((pattern) => file.includes(pattern))) : tests
  if (!targetTests.length) {
    console.error('No test files found')
    process.exit(1)
  }
  const tmpDir = path.join(root, '.vitest-stub')
  await fs.rm(tmpDir, { recursive: true, force: true })
  await ensureDir(tmpDir)

  const setupFile = path.join(root, 'vitest.setup.ts')
  try {
    await fs.access(setupFile)
    const setupOut = path.join(tmpDir, 'setup.mjs')
    await build({
      entryPoints: [setupFile],
      bundle: true,
      platform: 'node',
      format: 'esm',
      outfile: setupOut,
      target: 'es2022',
      sourcemap: false,
      logLevel: 'silent',
      external: ['vitest'],
    })
    await import(pathToFileURL(setupOut).href)
  } catch {}

  let totalPassed = 0
  let totalFailed = 0

  for (const [index, file] of targetTests.entries()) {
    const outFile = path.join(tmpDir, `${index}-${path.basename(file, '.ts')}.mjs`)
    await build({
      entryPoints: [file],
      bundle: true,
      platform: 'node',
      format: 'esm',
      outfile: outFile,
      target: 'es2022',
      sourcemap: false,
      logLevel: 'silent',
      external: ['vitest'],
    })

    reset()
    Object.assign(globalThis, { describe, it, test, beforeEach, afterAll, expect, vi })
    await import(pathToFileURL(outFile).href)
    const { passed, failed } = await runSuites()
    totalPassed += passed
    totalFailed += failed
  }

  console.log(`\nTest Summary: ${totalPassed} passed, ${totalFailed} failed`)
  if (totalFailed > 0) {
    process.exitCode = 1
  }
}

run().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
