// V2: models simulated by both this tool and Prosimos. Writes BPMN, scenario and Prosimos parameters.
import { writeFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { sequence, branches, loop, scenario, dist } from './lib/bpmn.mjs'
import { ROOT, CLI } from './lib/run.mjs'

const CASES = Number(process.env.CASES ?? 5000)
const IA = 60
const base = { cases: CASES, arrival: dist.exp(IA) }

const xor = branches('xor')
const and = branches('and')
const fb = loop()
const models = [
  {
    name: 'tandem',
    label: 'Sequence, two M/M/1 stations',
    m: sequence(2),
    sc: scenario({ ...base, tasks: { t1: { duration: dist.exp(40), resource: 'r1' }, t2: { duration: dist.exp(48), resource: 'r2' } }, resources: { r1: 1, r2: 1 } }),
  },
  {
    name: 'mm3',
    label: 'One activity, three servers',
    m: sequence(1),
    sc: scenario({ ...base, tasks: { t1: { duration: dist.exp(144), resource: 'r' } }, resources: { r: 3 } }),
  },
  {
    name: 'xor',
    label: 'Exclusive choice 30/70, shared role',
    m: xor,
    sc: scenario({
      ...base,
      tasks: { a: { duration: dist.lognormal(80, 40), resource: 'r' }, b: { duration: dist.gamma(40, 20), resource: 'r' } },
      resources: { r: 1 },
      flows: { [xor.flowId('split', 'a')]: 0.3, [xor.flowId('split', 'b')]: 0.7 },
    }),
  },
  {
    name: 'and',
    label: 'Parallel split, two roles',
    m: and,
    sc: scenario({ ...base, tasks: { a: { duration: dist.exp(45), resource: 'ra' }, b: { duration: dist.uniform(20, 80), resource: 'rb' } }, resources: { ra: 1, rb: 1 } }),
  },
  {
    name: 'loop',
    label: 'Rework loop p = 0.25',
    m: fb,
    sc: scenario({ ...base, tasks: { work: { duration: dist.exp(36), resource: 'r' } }, resources: { r: 1 }, flows: { [fb.flowId('check', 'merge')]: 0.25, [fb.flowId('check', 'end')]: 0.75 } }),
  },
]

const dir = join(ROOT, 'data', 'models')
mkdirSync(dir, { recursive: true })
const index = []
for (const x of models) {
  const bpmn = join(dir, `v2_${x.name}.bpmn`)
  const json = join(dir, `v2_${x.name}.json`)
  const ps = join(dir, `v2_${x.name}.prosimos.json`)
  writeFileSync(bpmn, x.m.xml)
  writeFileSync(json, JSON.stringify(x.sc, null, 2))
  execFileSync(process.execPath, [CLI, 'prosimos', bpmn, '--params', json, '--out', ps], { stdio: ['ignore', 'ignore', 'inherit'] })
  index.push({ name: x.name, label: x.label, cases: CASES, bpmn, json, prosimos: ps, tasks: x.m.tasks })
}
writeFileSync(join(dir, 'v2_index.json'), JSON.stringify(index, null, 2))
