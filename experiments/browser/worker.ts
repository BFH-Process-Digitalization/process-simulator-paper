// Runs the simulator's engine in a Web Worker, as the web application does, and times each replication.
import { simulate } from '../../tools/process-simulator/src/sim/engine'
import { buildGraph } from '../../tools/process-simulator/src/sim/graph'
import { completeScenario, upgradeScenario } from '../../tools/process-simulator/src/sim/params'
import { replicationSeed, summarize } from '../../tools/process-simulator/src/sim/replicate'
import type { Scenario } from '../../tools/process-simulator/src/sim/types'

interface Job {
  xml: string
  scenario: Scenario
  reps: number
}

self.onmessage = (e: MessageEvent<Job>) => {
  const { xml, scenario, reps } = e.data
  try {
    const { graph } = buildGraph(xml)
    const s = completeScenario(graph, upgradeScenario(scenario))
    const out = []
    for (let i = 0; i < reps; i++) {
      const seed = replicationSeed(s.seed, i)
      const t0 = performance.now()
      const r = simulate(graph, { ...s, seed }, { rng: 'keyed', traceCases: 0, logCases: 0 })
      const ms = performance.now() - t0
      out.push({ replication: i, seed, casesStarted: r.casesStarted, wallMs: ms, metrics: summarize(r) })
    }
    postMessage({ records: out })
  } catch (err) {
    postMessage({ error: err instanceof Error ? err.message : String(err) })
  }
}
