// Runs the simulator's command line and reads its JSON lines.
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
export const ROOT = resolve(here, '..', '..')
export const CLI = process.env.PROCSIM ?? join(ROOT, 'tools', 'process-simulator', 'dist-cli', 'procsim.mjs')
const WORK = join(ROOT, 'data', 'models')

/** Writes model and scenario under data/models/<name>, runs it and returns one record per replication. */
export function run(name, m, sc, { reps = 1, rng = 'keyed', activities = true } = {}) {
  mkdirSync(WORK, { recursive: true })
  const bpmn = join(WORK, `${name}.bpmn`)
  const json = join(WORK, `${name}.${sc.id}.json`)
  writeFileSync(bpmn, m.xml)
  writeFileSync(json, JSON.stringify(sc, null, 2))
  const args = [CLI, 'run', bpmn, '--params', json, '--reps', String(reps), '--rng', rng]
  if (activities) args.push('--activities')
  const out = execFileSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 30 })
  return out.trim().split('\n').map((l) => JSON.parse(l))
}

/** Appends records to data/<file>.jsonl (relative model paths). */
export function save(file, records) {
  const path = join(ROOT, 'data', file)
  mkdirSync(dirname(path), { recursive: true })
  appendFileSync(path, records.map((r) => JSON.stringify(r)).join('\n') + '\n')
}

export function reset(file) {
  const path = join(ROOT, 'data', file)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, '')
}
