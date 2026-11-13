// V5: how often does a scenario comparison pick the wrong option?
// The reference ranking comes from an independent high-precision run (seed block A, many
// replications per scenario); the evaluated decisions are drawn from a disjoint set of
// replications (seed block B), so no replication contributes to both. Decision budgets are
// swept from one run per scenario to groups of paired replications; correct-selection rates
// are reported with Wilson binomial intervals.
import { writeFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { sequence, scenario, dist } from './lib/bpmn.mjs'
import { ROOT, CLI } from './lib/run.mjs'
import { ci, binom } from './lib/stats.mjs'

const REF = Number(process.env.REF ?? 2000) // reference replications per scenario
const TRIALS = Number(process.env.TRIALS ?? 1000) // evaluation replications per scenario
const BUDGETS = [1, 2, 5, 10, 25, 50] // replications per scenario in one decision
const REFSEED = 1000 // seed block of the reference runs
const TRIALSEED = 900007 // disjoint seed block for the evaluated trials
const METRIC = 'cycle'
const dir = join(ROOT, 'data', 'models')
mkdirSync(dir, { recursive: true })

function cli(args) {
  const out = execFileSync(process.execPath, [CLI, ...args], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 30 })
  return out.trim().split('\n').map((l) => JSON.parse(l))
}

// Problem 1: the coffee shop shipped with the tool (one simulated day per run).
function coffee(reps, rng, seed) {
  const args = ['run', join(ROOT, 'tools/process-simulator/public/samples/coffee-shop.bpmn'), '--reps', String(reps), '--rng', rng]
  if (seed !== undefined) args.push('--seed', String(seed))
  return group(cli(args))
}

// Problem 2: a three-step office process with four improvement options.
const office = sequence(3)
const officeBase = { cases: 2000, arrival: dist.exp(60) }
const tasks = (t1 = 48, t2 = 100, t3 = 45) => ({
  t1: { duration: dist.exp(t1), resource: 'r1' },
  t2: { duration: dist.exp(t2), resource: 'r2' },
  t3: { duration: dist.exp(t3), resource: 'r3' },
})
const officeScenarios = [
  scenario({ ...officeBase, id: 'baseline', name: 'Baseline', tasks: tasks(), resources: { r1: 1, r2: 2, r3: 1 } }),
  scenario({ ...officeBase, id: 'A', name: 'Second person at step 1', tasks: tasks(), resources: { r1: 2, r2: 2, r3: 1 } }),
  scenario({ ...officeBase, id: 'B', name: 'Step 2 10 % faster', tasks: tasks(48, 90), resources: { r1: 1, r2: 2, r3: 1 } }),
  scenario({ ...officeBase, id: 'C', name: 'Step 3 11 % faster', tasks: tasks(48, 100, 40), resources: { r1: 1, r2: 2, r3: 1 } }),
  scenario({ ...officeBase, id: 'D', name: 'Second person at step 3', tasks: tasks(), resources: { r1: 1, r2: 2, r3: 2 } }),
]
function officeRuns(reps, rng, seed) {
  const bpmn = join(dir, 'v5_office.bpmn')
  writeFileSync(bpmn, office.xml)
  const recs = []
  for (const s of officeScenarios) {
    const json = join(dir, `v5_office.${s.id}.json`)
    writeFileSync(json, JSON.stringify(s, null, 2))
    const args = ['run', bpmn, '--params', json, '--reps', String(reps), '--rng', rng]
    if (seed !== undefined) args.push('--seed', String(seed))
    recs.push(...cli(args))
  }
  return group(recs)
}

function group(recs) {
  const by = {}
  for (const r of recs) (by[r.scenario] ??= { name: r.scenarioName, values: [] }).values[r.replication] = r.metrics[METRIC]
  return by
}

const argmin = (o) => Object.entries(o).reduce((a, b) => (b[1] < a[1] ? b : a))[0]

function analyse(name, ref, keyed, single) {
  const ids = Object.keys(ref)
  // reference ranking from the independent high-precision block only
  const truth = Object.fromEntries(ids.map((id) => [id, ci(ref[id].values)]))
  const ranked = ids.slice().sort((a, b) => truth[a].mean - truth[b].mean)
  const best = ranked[0]
  const runnerUp = ranked[1]
  const gap = truth[runnerUp].mean - truth[best].mean
  const out = {
    name,
    ref: REF,
    trials: TRIALS,
    scenarios: ids.map((id) => ({ id, name: ref[id].name, ...truth[id] })),
    best,
    runnerUp,
    gap,
    gapPct: gap / truth[best].mean,
    methods: {},
    budgets: {},
  }

  // one run per scenario: three ways of drawing the random numbers
  const oneRun = (data, pick) => {
    let correct = 0
    for (let i = 0; i < TRIALS; i++) {
      const choice = argmin(Object.fromEntries(ids.map((id) => [id, data[id].values[pick(i, id)]])))
      if (choice === best) correct++
    }
    return binom(correct, TRIALS)
  }
  const idx = Object.fromEntries(ids.map((id, k) => [id, k]))
  out.methods.singleStreamSameSeed = oneRun(single, (i) => i)
  out.methods.keyedSameSeed = oneRun(keyed, (i) => i)
  out.methods.independentSeeds = oneRun(keyed, (i, id) => (i + 97 * idx[id]) % TRIALS)

  // k paired replications per scenario: pick the lowest group mean
  for (const k of BUDGETS) {
    const groups = Math.floor(TRIALS / k)
    let correct = 0
    for (let g = 0; g < groups; g++) {
      const sl = (id) => keyed[id].values.slice(g * k, (g + 1) * k)
      const means = Object.fromEntries(ids.map((id) => [id, sl(id).reduce((a, b) => a + b, 0) / k]))
      if (argmin(means) === best) correct++
    }
    out.budgets[k] = binom(correct, groups)
  }

  // paired confidence intervals against the baseline at k = 10
  const k = 10
  const groups = Math.floor(TRIALS / k)
  const pair = { right: 0, wrong: 0, ns: 0, total: 0 }
  const base = ids.includes('baseline') ? 'baseline' : ids[0]
  for (let g = 0; g < groups; g++) {
    const sl = (id) => keyed[id].values.slice(g * k, (g + 1) * k)
    for (const id of ids.filter((x) => x !== base)) {
      const d = ci(sl(id).map((v, i) => v - sl(base)[i]))
      const trueSign = Math.sign(truth[id].mean - truth[base].mean)
      pair.total++
      if (d.lo > 0 || d.hi < 0) {
        if (Math.sign(d.mean) === trueSign) pair.right++
        else pair.wrong++
      } else pair.ns++
    }
  }
  out.pairedVsBaseline = { right: pair.right / pair.total, wrong: pair.wrong / pair.total, ns: pair.ns / pair.total }

  // variance of the difference to the baseline under the three ways of drawing random numbers
  out.varianceOfDifference = ids
    .filter((id) => id !== base)
    .map((id) => {
      const v = (xs) => ci(xs).sd ** 2
      return {
        id,
        trueDiff: truth[id].mean - truth[base].mean,
        independent: v(keyed[id].values.map((x, i) => x - keyed[base].values[(i + 1) % TRIALS])),
        singleStream: v(single[id].values.map((x, i) => x - single[base].values[i])),
        keyed: v(keyed[id].values.map((x, i) => x - keyed[base].values[i])),
      }
    })
  console.log(name, 'best', best, 'gap', gap.toFixed(1), `(${(100 * out.gapPct).toFixed(1)}%)`)
  for (const [m, b] of Object.entries(out.methods)) console.log('  ', m, `${(100 * b.p).toFixed(1)}% [${(100 * b.lo).toFixed(1)}, ${(100 * b.hi).toFixed(1)}]`)
  for (const [k, b] of Object.entries(out.budgets)) console.log('  paired', k, `${(100 * b.p).toFixed(1)}% [${(100 * b.lo).toFixed(1)}, ${(100 * b.hi).toFixed(1)}] (n=${b.n})`)
  for (const v of out.varianceOfDifference) console.log('  ', v.id, 'diff', v.trueDiff.toFixed(1), 'var ind/single/keyed', v.independent.toFixed(0), v.singleStream.toFixed(0), v.keyed.toFixed(0))
  return out
}

const problems = [
  analyse('Coffee shop', coffee(REF, 'keyed', REFSEED), coffee(TRIALS, 'keyed', TRIALSEED), coffee(TRIALS, 'single', TRIALSEED)),
  analyse('Office process', officeRuns(REF, 'keyed', REFSEED), officeRuns(TRIALS, 'keyed', TRIALSEED), officeRuns(TRIALS, 'single', TRIALSEED)),
]
mkdirSync(join(ROOT, 'results'), { recursive: true })
writeFileSync(join(ROOT, 'results', 'v5.json'), JSON.stringify({ ref: REF, trials: TRIALS, budgets: BUDGETS, metric: METRIC, refSeed: REFSEED, trialSeed: TRIALSEED, problems }, null, 2))
mkdirSync(join(ROOT, 'data', 'v5'), { recursive: true })
