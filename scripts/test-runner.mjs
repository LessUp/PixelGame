#!/usr/bin/env node
import { buildSync } from 'esbuild'
import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))
const projectRoot = path.resolve(here, '..')
const outDir = path.join(projectRoot, '.tmp-tests')

function findTests(dir, pattern) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    const info = statSync(full)
    if (info.isDirectory()) {
      out.push(...findTests(full, pattern))
    } else if (pattern.test(full)) {
      out.push(full)
    }
  }
  return out.sort()
}

function compileModule(source) {
  const rel = path.relative(projectRoot, source)
  const outFile = path.join(outDir, rel).replace(/\.ts$/, '.mjs')
  mkdirSync(path.dirname(outFile), { recursive: true })
  buildSync({
    entryPoints: [source],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: ['node18'],
    sourcemap: false,
    outfile: outFile,
    logLevel: 'silent',
  })
  return outFile
}

async function loadModule(file) {
  const compiled = compileModule(file)
  await import(pathToFileURL(compiled).href)
}

async function main() {
  const args = process.argv.slice(2)
  const perfOnly = args.includes('performance')

  rmSync(outDir, { recursive: true, force: true })
  mkdirSync(outDir, { recursive: true })

  const setupFile = path.join(projectRoot, 'vitest.setup.ts')
  await loadModule(setupFile)

  const pattern = perfOnly
    ? /\.performance\.test\.ts$/
    : /\.test\.ts$/

  const allTests = findTests(path.join(projectRoot, 'src'), pattern)

  if (!allTests.length) {
    console.log('No test files matched pattern.')
    return
  }

  for (const test of allTests) {
    await loadModule(test)
  }

  const harness = globalThis.__pixelHarness
  if (!harness) {
    console.error('Test harness did not initialize correctly.')
    process.exitCode = 1
    return
  }

  await harness.queue.catch(() => undefined)

  const { totals, failures } = harness
  console.log(`\n${totals.passed}/${totals.total} tests passed.`)
  if (failures.length) {
    console.log(`${failures.length} failing test(s):`)
    for (const failure of failures) {
      console.log(`- ${[...failure.suite, failure.name].join(' > ')}`)
      console.log(failure.message)
    }
    process.exitCode = 1
  }
}

await main()
