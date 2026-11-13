// V6: run time of the simulation engine in Node, by number of cases and by model size.
import { writeFileSync, mkdirSync } from 'node:fs'
import { cpus } from 'node:os'
import { join } from 'node:path'
import { sequence, branches, scenario, dist } from './lib/bpmn.mjs'
import { run, ROOT } from './lib/run.mjs'

const REPS = Number(process.env.REPS ?? 5)
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
const rows = []

function measure(series, x, m, sc) {
  const recs = run(`v6_${series}_${x}`, m, sc, { reps: REPS, activities: false })
  const ms = median(recs.map((r) => r.wallMs))
  const events = recs[0].casesStarted
  rows.push({ series, x, cases: sc.cases, tasks: m.tasks.length, ms, casesPerSecond: (1000 * events) / ms })
  console.log(series, x, `${ms.toFixed(1)} ms`, `${Math.round((1000 * events) / ms)} cases/s`)
}

// 1. number of cases, one activity with one resource (utilisation 0.8)
for (const n of [1e3, 1e4, 1e5, 1e6]) {
  const m = sequence(1)
  measure('cases', n, m, scenario({ cases: n, arrival: dist.exp(60), tasks: { t1: { duration: dist.exp(48), resource: 'r' } }, resources: { r: 1 } }))
}
// 2. length of a sequence, every activity with its own resource, 10,000 cases
for (const k of [5, 10, 20, 50, 100, 200]) {
  const m = sequence(k)
  const tasks = Object.fromEntries(m.tasks.map((t) => [t, { duration: dist.exp(40), resource: 'r' + t }]))
  const resources = Object.fromEntries(m.tasks.map((t) => ['r' + t, 1]))
  measure('sequence', k, m, scenario({ cases: 10000, arrival: dist.exp(60), tasks, resources }))
}
// 3. width of a parallel split, 10,000 cases
for (const k of [2, 5, 10, 20, 50]) {
  const ids = Array.from({ length: k }, (_, i) => `p${i + 1}`)
  const m = branches('and', ids)
  const tasks = Object.fromEntries(ids.map((t) => [t, { duration: dist.exp(40), resource: 'r' + t }]))
  const resources = Object.fromEntries(ids.map((t) => ['r' + t, 1]))
  measure('parallel', k, m, scenario({ cases: 10000, arrival: dist.exp(60), tasks, resources }))
}

mkdirSync(join(ROOT, 'results'), { recursive: true })
writeFileSync(
  join(ROOT, 'results', 'v6.json'),
  JSON.stringify({ reps: REPS, node: process.version, cpu: cpus()[0]?.model, threads: cpus().length, rows }, null, 2),
)
