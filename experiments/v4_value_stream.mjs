// V4: value stream figures on sequence, exclusive choice, parallel split, rework loop and
// a composite model. Expected values are computed by hand from the model; "classic" is a
// linear value stream map that puts every step in one line and adds up the step times.
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { sequence, branches, loop, model, scenario, dist } from './lib/bpmn.mjs'
import { run, save, reset, ROOT } from './lib/run.mjs'
import { ci, mmcWait } from './lib/stats.mjs'

const REPS = Number(process.env.REPS ?? 30)
const CASES = 2000
const arrival = dist.exp(600)
const fixed = dist.fixed
const xor = branches('xor')
const and = branches('and')
const fb = loop()
const p = 0.5

// choice between a parallel pair and a single task, then a rework loop; fixed durations
const composite = model(
  'composite',
  [
    { id: 'start', type: 'start' },
    { id: 'pre', type: 'task' },
    { id: 'split', type: 'xor' },
    { id: 'par', type: 'and' },
    { id: 'a1', type: 'task' },
    { id: 'a2', type: 'task' },
    { id: 'joinA', type: 'and' },
    { id: 'b', type: 'task' },
    { id: 'merge', type: 'xor' },
    { id: 'work', type: 'task' },
    { id: 'check', type: 'xor' },
    { id: 'end', type: 'end' },
  ],
  [
    ['start', 'pre'], ['pre', 'split'], ['split', 'par'], ['split', 'b'],
    ['par', 'a1'], ['par', 'a2'], ['a1', 'joinA'], ['a2', 'joinA'],
    ['joinA', 'merge'], ['b', 'merge'], ['merge', 'work'], ['work', 'check'],
    ['check', 'merge'], ['check', 'end'],
  ],
)

const cases = [
  {
    name: 'Sequence',
    m: sequence(3),
    sc: scenario({ cases: CASES, arrival, tasks: { t1: { duration: fixed(10), value: 'va' }, t2: { duration: fixed(20), value: 'nva' }, t3: { duration: fixed(30), value: 'bva' } } }),
    exact: { lead: 60, va: 10, bva: 30, nva: 20, rework: 0, wait: 0 },
    classic: { lead: 60, va: 10 },
    work: { va: 10, total: 60 },
  },
  {
    name: 'Exclusive choice (30/70)',
    m: xor,
    sc: scenario({
      cases: CASES,
      arrival,
      tasks: { a: { duration: fixed(100), value: 'va' }, b: { duration: fixed(40), value: 'nva' } },
      flows: { [xor.flowId('split', 'a')]: 0.3, [xor.flowId('split', 'b')]: 0.7 },
    }),
    exact: { lead: 0.3 * 100 + 0.7 * 40, va: 30, bva: 0, nva: 28, rework: 0, wait: 0 },
    classic: { lead: 140, va: 100 },
    work: { va: 30, total: 58 },
  },
  {
    name: 'Parallel split',
    m: and,
    sc: scenario({ cases: CASES, arrival, tasks: { a: { duration: fixed(50), value: 'va' }, b: { duration: fixed(30), value: 'nva' } } }),
    exact: { lead: 50, va: 50, bva: 0, nva: 0, rework: 0, wait: 0 },
    classic: { lead: 80, va: 50 },
    work: { va: 50, total: 80 },
  },
  {
    // VA and NVA work of equal length run concurrently: the whole interval counts as VA
    // under the precedence rule, so PCE is 1 although half the work content is NVA.
    name: 'Parallel VA + NVA, equal duration',
    m: and,
    sc: scenario({ cases: CASES, arrival, tasks: { a: { duration: fixed(50), value: 'va' }, b: { duration: fixed(50), value: 'nva' } } }),
    exact: { lead: 50, va: 50, bva: 0, nva: 0, rework: 0, wait: 0 },
    classic: { lead: 100, va: 50 },
    work: { va: 50, total: 100 },
  },
  {
    name: 'Choice + parallel + rework (composite)',
    m: composite,
    sc: scenario({
      cases: CASES,
      arrival,
      tasks: {
        pre: { duration: fixed(10), value: 'va' },
        a1: { duration: fixed(30), value: 'va' },
        a2: { duration: fixed(20), value: 'nva' },
        b: { duration: fixed(25), value: 'nva' },
        work: { duration: fixed(15), value: 'va' },
      },
      flows: {
        [composite.flowId('split', 'par')]: 0.4,
        [composite.flowId('split', 'b')]: 0.6,
        [composite.flowId('check', 'merge')]: 0.3,
        [composite.flowId('check', 'end')]: 0.7,
      },
    }),
    exact: {
      lead: 10 + 0.4 * 30 + 0.6 * 25 + 15 / 0.7,
      va: 10 + 0.4 * 30 + 15,
      bva: 0,
      nva: 0.6 * 25,
      rework: 15 * (0.3 / 0.7),
      wait: 0,
    },
    classic: { lead: 10 + 30 + 20 + 25 + 15, va: 10 + 30 + 15 },
    work: { va: 10 + 0.4 * 30 + 15 / 0.7, total: 10 + 0.4 * 50 + 0.6 * 25 + 15 / 0.7 },
  },
  {
    name: `Rework loop (p = ${p})`,
    m: fb,
    sc: scenario({
      cases: CASES,
      arrival,
      tasks: { work: { duration: fixed(20), value: 'va' } },
      flows: { [fb.flowId('check', 'merge')]: p, [fb.flowId('check', 'end')]: 1 - p },
    }),
    exact: { lead: 20 / (1 - p), va: 20, bva: 0, nva: 0, rework: (20 * p) / (1 - p), wait: 0 },
    classic: { lead: 20, va: 20 },
    work: { va: 40, total: 40 },
  },
  {
    name: 'Sequence with queues (M/M/1 tandem)',
    m: sequence(2),
    sc: scenario({
      cases: 100000,
      arrival: dist.exp(60),
      warmup: 120000,
      tasks: { t1: { duration: dist.exp(40), resource: 'r1', value: 'va' }, t2: { duration: dist.exp(48), resource: 'r2', value: 'nva' } },
      resources: { r1: 1, r2: 1 },
    }),
    exact: (() => {
      const w = mmcWait(1 / 60, 1 / 40, 1) + mmcWait(1 / 60, 1 / 48, 1)
      return { lead: 40 + 48 + w, va: 40, bva: 0, nva: 48, rework: 0, wait: w }
    })(),
    classic: null,
    work: { va: 40, total: 88 },
  },
]

const KEYS = ['lead', 'va', 'bva', 'nva', 'rework', 'wait']
reset('v4/runs.jsonl')
const rows = []
for (const [i, c] of cases.entries()) {
  const recs = run(`v4_${i + 1}`, c.m, c.sc, { reps: REPS })
  save('v4/runs.jsonl', recs.map((r) => ({ case: c.name, ...r })))
  const get = (r, k) => (k === 'lead' ? r.metrics.cycle : r.metrics['flow.' + k])
  const row = { case: c.name, exact: c.exact, classic: c.classic, tool: {}, partitionError: 0 }
  for (const k of KEYS) row.tool[k] = ci(recs.map((r) => get(r, k)))
  // the parts of the split must add up to the lead time in every run
  row.partitionError = Math.max(
    ...recs.map((r) => Math.abs(['va', 'bva', 'nva', 'rework', 'none', 'wait'].reduce((a, k) => a + r.metrics['flow.' + k], 0) - r.metrics.cycle) / r.metrics.cycle),
  )
  row.pce = { exact: c.exact.va / c.exact.lead, tool: ci(recs.map((r) => r.metrics.pce)), classic: c.classic ? c.classic.va / c.classic.lead : null }
  // work-content share of VA effort over all executed work, repetitions counted under
  // the value class of their activity
  const shares = recs.map((r) => {
    let va = 0
    let total = 0
    for (const a of r.activities) {
      const w = a.count * a.processing
      total += w
      if (c.sc.elements[a.id]?.value === 'va') va += w
    }
    return total ? va / total : 0
  })
  row.work = { exact: c.work.va / c.work.total, tool: ci(shares) }
  rows.push(row)
  console.log(c.name, KEYS.map((k) => `${k} ${row.tool[k].mean.toFixed(2)}/${c.exact[k].toFixed(2)}`).join(' '), `PCE ${row.pce.tool.mean.toFixed(3)}/${row.pce.exact.toFixed(3)} classic ${row.pce.classic?.toFixed(3)}`, `partition err ${row.partitionError.toExponential(1)}`)
}
mkdirSync(join(ROOT, 'results'), { recursive: true })
writeFileSync(join(ROOT, 'results', 'v4.json'), JSON.stringify({ reps: REPS, rows }, null, 2))
