export class Bench {
  constructor(options = {}) {
    this.options = options
    this.tasks = []
  }
  add(name, fn) {
    const task = { name, fn, result: { mean: 0, samples: [], variance: 0, deviation: 0, hz: 0 } }
    this.tasks.push(task)
    return this
  }
  async run() {
    for (const task of this.tasks) {
      const start = performance.now()
      await task.fn()
      const end = performance.now()
      task.result.mean = (end - start) / 1000
      task.result.samples.push(task.result.mean)
    }
  }
}
