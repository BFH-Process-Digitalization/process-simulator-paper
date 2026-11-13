// V6: run time of the simulation engine in Node, by number of cases and by model size.
import { writeFileSync, mkdirSync } from 'node:fs'
import { cpus } from 'node:os'
import { join } from 'node:path'
import { v6Cases } from './lib/v6_cases.mjs'
import { run, ROOT } from './lib/run.mjs'

const REPS = Number(process.env.REPS ?? 5)
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
const rows = []

for (const { series, x, m, sc } of v6Cases()) {
  // the engine stops after a safety cap of events; allow enough for every case to arrive and finish
  const recs = run(`v6_${series}_${x}`, m, sc, { reps: REPS, activities: false, extra: ['--max-events', String(10 * sc.cases * (m.tasks.length + 2))] })
  const ms = median(recs.map((r) => r.wallMs))
  const events = recs[0].casesStarted
  const capped = recs.some((r) => r.warnings?.length)
  rows.push({ series, x, cases: sc.cases, started: events, capped, tasks: m.tasks.length, ms, casesPerSecond: (1000 * events) / ms })
  console.log(series, x, `${ms.toFixed(1)} ms`, `${Math.round((1000 * events) / ms)} cases/s`, events === sc.cases ? '' : `only ${events} of ${sc.cases} cases ran`)
}

mkdirSync(join(ROOT, 'results'), { recursive: true })
writeFileSync(
  join(ROOT, 'results', 'v6.json'),
  JSON.stringify({ reps: REPS, node: process.version, cpu: cpus()[0]?.model, threads: cpus().length, rows }, null, 2),
)
