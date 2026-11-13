// V6 workloads: number of cases, length of a sequence, width of a parallel split.
import { sequence, branches, scenario, dist } from './bpmn.mjs'

export function v6Cases() {
  const out = []
  // 1. number of cases, one activity with one resource (utilisation 0.8)
  for (const n of [1e3, 1e4, 1e5, 1e6]) {
    const m = sequence(1)
    out.push({ series: 'cases', x: n, m, sc: scenario({ cases: n, arrival: dist.exp(60), tasks: { t1: { duration: dist.exp(48), resource: 'r' } }, resources: { r: 1 } }) })
  }
  // 2. length of a sequence, every activity with its own resource, 10,000 cases
  for (const k of [5, 10, 20, 50, 100, 200]) {
    const m = sequence(k)
    const tasks = Object.fromEntries(m.tasks.map((t) => [t, { duration: dist.exp(40), resource: 'r' + t }]))
    const resources = Object.fromEntries(m.tasks.map((t) => ['r' + t, 1]))
    out.push({ series: 'sequence', x: k, m, sc: scenario({ cases: 10000, arrival: dist.exp(60), tasks, resources }) })
  }
  // 3. width of a parallel split, 10,000 cases
  for (const k of [2, 5, 10, 20, 50]) {
    const ids = Array.from({ length: k }, (_, i) => `p${i + 1}`)
    const m = branches('and', ids)
    const tasks = Object.fromEntries(ids.map((t) => [t, { duration: dist.exp(40), resource: 'r' + t }]))
    const resources = Object.fromEntries(ids.map((t) => ['r' + t, 1]))
    out.push({ series: 'parallel', x: k, m, sc: scenario({ cases: 10000, arrival: dist.exp(60), tasks, resources }) })
  }
  return out
}
