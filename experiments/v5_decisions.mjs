// V5: how often does a scenario comparison pick the wrong option?
// Each decision problem has a set of scenarios; the reference ranking comes from the mean over
// many replications. Decisions from one run per scenario (as in most what-if tools) and from
// 10 paired runs with confidence intervals are compared against it.
import { writeFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { sequence, scenario, dist } from './lib/bpmn.mjs'
import { ROOT, CLI } from './lib/run.mjs'
import { ci } from './lib/stats.mjs'

const N = Number(process.env.N ?? 2000) // replications per scenario and random-number mode
const GROUP = 10 // runs per scenario for the replicated decision
const METRIC = 'cycle'
const dir = join(ROOT, 'data', 'models')
mkdirSync(dir, { recursive: true })

function cli(args) {
  const out = execFileSync(process.execPath, [CLI, ...args], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 30 })
  return out.trim().split('\n').map((l) => JSON.parse(l))
}

// Problem 1: the coffee shop shipped with the tool (one simulated day per run).
function coffee(rng) {
  const recs = cli(['run', join(ROOT, 'tools/process-simulator/public/samples/coffee-shop.bpmn'), '--reps', String(N), '--rng', rng])
  return group(recs)
}

// Problem 2: a three-step office process with four improvement options.
const office = sequence(3)
const officeBase = { cases: 2000, arrival: dist.exp(60), seed: 7 }
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
function officeRuns(rng) {
  const bpmn = join(dir, 'v5_office.bpmn')
  writeFileSync(bpmn, office.xml)
  const recs = []
  for (const s of officeScenarios) {
    const json = join(dir, `v5_office.${s.id}.json`)
    writeFileSync(json, JSON.stringify(s, null, 2))
    recs.push(...cli(['run', bpmn, '--params', json, '--reps', String(N), '--rng', rng]))
  }
  return group(recs)
}

function group(recs) {
  const by = {}
  for (const r of recs) (by[r.scenario] ??= { name: r.scenarioName, values: [] }).values[r.replication] = r.metrics[METRIC]
  return by
}

const argmin = (o) => Object.entries(o).reduce((a, b) => (b[1] < a[1] ? b : a))[0]

function analyse(name, keyed, single) {
  const ids = Object.keys(keyed)
  const truth = Object.fromEntries(ids.map((id) => [id, ci([...keyed[id].values, ...single[id].values])]))
  const best = argmin(Object.fromEntries(ids.map((id) => [id, truth[id].mean])))
  const out = { name, n: N, scenarios: ids.map((id) => ({ id, name: keyed[id].name, ...truth[id] })), best, methods: {} }

  // one run per scenario, run i of every scenario with the same seed
  const oneRun = (data, pair) => {
    let correct = 0
    for (let i = 0; i < N; i++) {
      const pick = argmin(Object.fromEntries(ids.map((id) => [id, data[id].values[pair(i, id)]])))
      if (pick === best) correct++
    }
    return correct / N
  }
  const idx = Object.fromEntries(ids.map((id, k) => [id, k]))
  out.methods.singleStreamSameSeed = oneRun(single, (i) => i)
  out.methods.keyedSameSeed = oneRun(keyed, (i) => i)
  out.methods.independentSeeds = oneRun(keyed, (i, id) => (i + 97 * idx[id]) % N)

  // GROUP paired runs: pick the lowest mean; also compare each option with the baseline by paired CI
  const groups = Math.floor(N / GROUP)
  let correct = 0
  const pair = { right: 0, wrong: 0, ns: 0, total: 0 }
  const base = ids[0]
  for (let g = 0; g < groups; g++) {
    const sl = (id) => keyed[id].values.slice(g * GROUP, (g + 1) * GROUP)
    const means = Object.fromEntries(ids.map((id) => [id, sl(id).reduce((a, b) => a + b, 0) / GROUP]))
    if (argmin(means) === best) correct++
    for (const id of ids.slice(1)) {
      const d = ci(sl(id).map((v, i) => v - sl(base)[i]))
      const trueSign = Math.sign(truth[id].mean - truth[base].mean)
      pair.total++
      if (d.lo > 0 || d.hi < 0) {
        if (Math.sign(d.mean) === trueSign) pair.right++
        else pair.wrong++
      } else pair.ns++
    }
  }
  out.methods.replicatedMean = correct / groups
  out.pairedVsBaseline = { right: pair.right / pair.total, wrong: pair.wrong / pair.total, ns: pair.ns / pair.total }

  // variance of the difference to the baseline under the three ways of drawing random numbers
  out.varianceOfDifference = ids.slice(1).map((id) => {
    const v = (xs) => ci(xs).sd ** 2
    return {
      id,
      trueDiff: truth[id].mean - truth[base].mean,
      independent: v(keyed[id].values.map((x, i) => x - keyed[base].values[(i + 1) % N])),
      singleStream: v(single[id].values.map((x, i) => x - single[base].values[i])),
      keyed: v(keyed[id].values.map((x, i) => x - keyed[base].values[i])),
    }
  })
  console.log(name, 'best', best, JSON.stringify(out.methods), JSON.stringify(out.pairedVsBaseline))
  for (const v of out.varianceOfDifference) console.log('  ', v.id, 'diff', v.trueDiff.toFixed(1), 'var ind/single/keyed', v.independent.toFixed(0), v.singleStream.toFixed(0), v.keyed.toFixed(0))
  return out
}

const problems = [analyse('Coffee shop', coffee('keyed'), coffee('single')), analyse('Office process', officeRuns('keyed'), officeRuns('single'))]
mkdirSync(join(ROOT, 'results'), { recursive: true })
writeFileSync(join(ROOT, 'results', 'v5.json'), JSON.stringify({ n: N, group: GROUP, metric: METRIC, problems }, null, 2))
mkdirSync(join(ROOT, 'data', 'v5'), { recursive: true })
