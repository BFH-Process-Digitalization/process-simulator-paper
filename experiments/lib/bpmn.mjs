// Builds small BPMN 2.0 models from a list of nodes and flows.

const TAG = { start: 'startEvent', end: 'endEvent', task: 'task', xor: 'exclusiveGateway', and: 'parallelGateway' }

export function model(id, nodes, flows) {
  const out = new Map(nodes.map((n) => [n.id, []]))
  const inc = new Map(nodes.map((n) => [n.id, []]))
  const fl = flows.map(([from, to], i) => ({ id: `f${i + 1}_${from}_${to}`, from, to }))
  for (const f of fl) {
    out.get(f.from).push(f.id)
    inc.get(f.to).push(f.id)
  }
  const el = nodes
    .map((n) => {
      const tag = TAG[n.type]
      const refs = [...inc.get(n.id).map((f) => `<bpmn:incoming>${f}</bpmn:incoming>`), ...out.get(n.id).map((f) => `<bpmn:outgoing>${f}</bpmn:outgoing>`)]
      return `    <bpmn:${tag} id="${n.id}" name="${n.name ?? n.id}">\n      ${refs.join('\n      ')}\n    </bpmn:${tag}>`
    })
    .join('\n')
  const sf = fl.map((f) => `    <bpmn:sequenceFlow id="${f.id}" sourceRef="${f.from}" targetRef="${f.to}" />`).join('\n')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="defs_${id}" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="${id}" isExecutable="false">
${el}
${sf}
  </bpmn:process>
</bpmn:definitions>
`
  const flowId = (from, to) => fl.find((f) => f.from === from && f.to === to).id
  return { xml, flowId, tasks: nodes.filter((n) => n.type === 'task').map((n) => n.id) }
}

/** start -> t1 -> ... -> tn -> end */
export function sequence(n, prefix = 't') {
  const ids = Array.from({ length: n }, (_, i) => `${prefix}${i + 1}`)
  const nodes = [{ id: 'start', type: 'start' }, ...ids.map((id) => ({ id, type: 'task' })), { id: 'end', type: 'end' }]
  const chain = ['start', ...ids, 'end']
  return model(`seq${n}`, nodes, chain.slice(1).map((x, i) => [chain[i], x]))
}

/** start -> split -> (a | b) -> join -> end, gateway type xor or and */
export function branches(type, ids = ['a', 'b']) {
  const nodes = [
    { id: 'start', type: 'start' },
    { id: 'split', type },
    ...ids.map((id) => ({ id, type: 'task' })),
    { id: 'join', type },
    { id: 'end', type: 'end' },
  ]
  const flows = [['start', 'split'], ...ids.flatMap((id) => [['split', id], [id, 'join']]), ['join', 'end']]
  return model(`${type}${ids.length}`, nodes, flows)
}

/** start -> pre -> merge -> work -> check -(p)-> merge, -(1-p)-> end */
export function loop() {
  const nodes = [
    { id: 'start', type: 'start' },
    { id: 'merge', type: 'xor' },
    { id: 'work', type: 'task' },
    { id: 'check', type: 'xor' },
    { id: 'end', type: 'end' },
  ]
  return model('loop', nodes, [['start', 'merge'], ['merge', 'work'], ['work', 'check'], ['check', 'merge'], ['check', 'end']])
}

// ---------------------------------------------------------------------------
// Scenarios (the simulator's JSON format)

export const ALWAYS = { id: 'always', name: '24/7', periods: [{ fromDay: 0, toDay: 6, from: '00:00', to: '24:00' }] }

export const dist = {
  exp: (mean) => ({ type: 'exponential', mean, unit: 'seconds' }),
  fixed: (mean) => ({ type: 'fixed', mean, unit: 'seconds' }),
  uniform: (min, max) => ({ type: 'uniform', mean: (min + max) / 2, min, max, unit: 'seconds' }),
  normal: (mean, sd) => ({ type: 'normal', mean, sd, unit: 'seconds' }),
  lognormal: (mean, sd) => ({ type: 'lognormal', mean, sd, unit: 'seconds' }),
  gamma: (mean, sd) => ({ type: 'gamma', mean, sd, unit: 'seconds' }),
}

/**
 * tasks: { id: { duration, resource?, value? } }, resources: { id: count }
 * Tasks without a resource need no one.
 */
export function scenario({ id = 'baseline', name = id, cases, arrival, warmup = 0, seed = 1, tasks, resources = {}, flows = {} }) {
  const elements = {}
  for (const [t, p] of Object.entries(tasks)) elements[t] = { duration: p.duration, resourceId: p.resource, value: p.value }
  return {
    id,
    name,
    cases,
    arrival,
    startDate: '2026-01-05T00:00:00',
    currency: 'CHF',
    resources: Object.entries(resources).map(([rid, count]) => ({ id: rid, name: rid, count, hourlyRate: 0, calendarId: 'always' })),
    calendars: [ALWAYS],
    elements,
    flows,
    trim: 0,
    warmup,
    seed,
  }
}
