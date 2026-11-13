// V1: verification against queueing results with known exact values.
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { sequence, loop, scenario, dist } from './lib/bpmn.mjs'
import { run, save, reset, ROOT } from './lib/run.mjs'
import { ci, mmcWait, mg1Wait } from './lib/stats.mjs'

const REPS = Number(process.env.REPS ?? 30)
const CASES = Number(process.env.CASES ?? 100000)
const IA = 60 // mean time between arrivals, seconds
const lambda = 1 / IA
const WARMUP = 2000 * IA

const one = sequence(1)
const two = sequence(2)
const single = (name, duration, c, exact, extra = {}) => ({
  name,
  model: one,
  sc: scenario({ cases: CASES, arrival: dist.exp(IA), warmup: WARMUP, tasks: { t1: { duration, resource: 'r' } }, resources: { r: c } }),
  checks: [{ metric: 'wait.t1', label: 'mean wait', exact }],
  rho: (lambda * duration.mean) / c,
  ...extra,
})

const cases = [
  single('M/M/1, rho=0.5', dist.exp(30), 1, mmcWait(lambda, 1 / 30, 1)),
  single('M/M/1, rho=0.8', dist.exp(48), 1, mmcWait(lambda, 1 / 48, 1)),
  single('M/M/1, rho=0.9', dist.exp(54), 1, mmcWait(lambda, 1 / 54, 1)),
  single('M/M/3, rho=0.8', dist.exp(144), 3, mmcWait(lambda, 1 / 144, 3)),
  single('M/M/10, rho=0.9', dist.exp(540), 10, mmcWait(lambda, 1 / 540, 10)),
  single('M/D/1, rho=0.8', dist.fixed(48), 1, mg1Wait(lambda, 48, 0)),
  single('M/U/1, rho=0.8', dist.uniform(24, 72), 1, mg1Wait(lambda, 48, 48 ** 2 / 12)),
  single('M/G/1 lognormal cv=1.5, rho=0.8', dist.lognormal(48, 72), 1, mg1Wait(lambda, 48, 72 ** 2)),
  single('M/G/1 gamma cv=0.5, rho=0.8', dist.gamma(48, 24), 1, mg1Wait(lambda, 48, 24 ** 2)),
  {
    name: 'Tandem M/M/1 to M/M/1',
    model: two,
    sc: scenario({
      cases: CASES,
      arrival: dist.exp(IA),
      warmup: WARMUP,
      tasks: { t1: { duration: dist.exp(40), resource: 'r1' }, t2: { duration: dist.exp(48), resource: 'r2' } },
      resources: { r1: 1, r2: 1 },
    }),
    checks: [
      { metric: 'wait.t1', label: 'mean wait station 1', exact: mmcWait(lambda, 1 / 40, 1) },
      { metric: 'wait.t2', label: 'mean wait station 2', exact: mmcWait(lambda, 1 / 48, 1) },
    ],
    rho: lambda * 48,
  },
  (() => {
    // Jackson network with Bernoulli feedback: each visit sees an M/M/1 queue with rate lambda/(1-p).
    const p = 0.25
    const m = loop()
    const le = lambda / (1 - p)
    return {
      name: 'Jackson feedback, p=0.25',
      model: m,
      sc: scenario({
        cases: CASES,
        arrival: dist.exp(IA),
        warmup: WARMUP,
        tasks: { work: { duration: dist.exp(36), resource: 'r' } },
        resources: { r: 1 },
        flows: { [m.flowId('check', 'merge')]: p, [m.flowId('check', 'end')]: 1 - p },
      }),
      checks: [
        { metric: 'wait.work', label: 'mean wait per visit', exact: mmcWait(le, 1 / 36, 1) },
        { metric: 'cycle', label: 'mean time in system', exact: (mmcWait(le, 1 / 36, 1) + 36) / (1 - p) },
      ],
      rho: le * 36,
    }
  })(),
]

reset('v1/runs.jsonl')
const rows = []
for (const [i, c] of cases.entries()) {
  const recs = run(`v1_${i + 1}`, c.model, c.sc, { reps: REPS })
  save('v1/runs.jsonl', recs.map((r) => ({ case: c.name, ...r })))
  for (const k of c.checks) {
    const s = ci(recs.map((r) => r.metrics[k.metric]))
    rows.push({ case: c.name, rho: c.rho, quantity: k.label, exact: k.exact, ...s, relErr: (s.mean - k.exact) / k.exact, covered: s.lo <= k.exact && k.exact <= s.hi })
  }
  // Little's law L = lambda W on every replication
  const little = ci(recs.map((r) => (r.metrics.wip - lambda * r.metrics.cycle) / r.metrics.wip))
  rows.push({ case: c.name, rho: c.rho, quantity: "Little's law (L - lambda W)/L", exact: 0, ...little, relErr: little.mean, covered: little.lo <= 0 && 0 <= little.hi })
  console.log(c.name, rows.slice(-1 - c.checks.length).map((r) => `${r.quantity}: ${r.mean.toFixed(2)} vs ${r.exact.toFixed(2)} (${(100 * r.relErr).toFixed(2)} %) ${r.covered ? 'in CI' : 'OUT'}`).join(' | '))
}
mkdirSync(join(ROOT, 'results'), { recursive: true })
writeFileSync(join(ROOT, 'results', 'v1.json'), JSON.stringify({ reps: REPS, cases: CASES, warmup: WARMUP, rows }, null, 2))
