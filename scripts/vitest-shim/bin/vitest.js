#!/usr/bin/env node
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))
const projectRoot = path.resolve(here, '..', '..', '..')
const runner = path.resolve(projectRoot, 'scripts', 'test-runner.mjs')

const { run } = await import(pathToFileURL(runner).href)

const rawArgs = process.argv.slice(2)
const args = rawArgs.filter((arg) => arg !== 'run')
const performanceOnly = args.includes('--performance') || args.includes('performance')

await run({ performanceOnly })
