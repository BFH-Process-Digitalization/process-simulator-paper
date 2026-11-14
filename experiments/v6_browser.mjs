// V6: the same workloads as v6_performance.mjs, run by the engine in a Web Worker in headless Chromium and Firefox.
// Each browser's results are checked against the command line's for the same seeds.
import { createServer } from 'node:http'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { chromium, firefox } from 'playwright-core'
import { v6Cases } from './lib/v6_cases.mjs'
import { run, ROOT } from './lib/run.mjs'

const REPS = Number(process.env.REPS ?? 5)
const SIM = join(ROOT, 'tools', 'process-simulator')
const OUT = join(ROOT, 'data', 'v6_browser')
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]

mkdirSync(OUT, { recursive: true })
const { build } = createRequire(join(SIM, 'package.json'))('esbuild')
await build({
  entryPoints: [join(ROOT, 'experiments', 'browser', 'worker.ts')],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  outfile: join(OUT, 'worker.js'),
  define: { __VERSION__: '"bench"' },
  logLevel: 'warning',
})
const files = { '/': join(ROOT, 'experiments', 'browser', 'index.html'), '/worker.js': join(OUT, 'worker.js') }
const types = { '/': 'text/html', '/worker.js': 'text/javascript' }
const server = createServer((req, res) => {
  const f = files[req.url]
  if (!f) return res.writeHead(404).end()
  res.writeHead(200, { 'content-type': types[req.url] }).end(readFileSync(f))
})
await new Promise((ok) => server.listen(0, '127.0.0.1', ok))
const url = `http://127.0.0.1:${server.address().port}/`

const cases = v6Cases()
const reference = new Map()
for (const c of cases)
  reference.set(
    `${c.series}_${c.x}`,
    run(`v6_${c.series}_${c.x}`, c.m, c.sc, { reps: 1, activities: false, extra: ['--max-events', String(10 * c.sc.cases * (c.m.tasks.length + 2))] })[0].metrics,
  )

const rows = []
const browsers = {}
let mismatches = 0
for (const [name, type] of [['Chromium', chromium], ['Firefox', firefox]]) {
  const browser = await type.launch({ headless: true })
  browsers[name] = browser.version()
  const page = await browser.newPage()
  await page.goto(url)
  for (const { series, x, m, sc } of cases) {
    const recs = await page.evaluate((job) => window.bench(job), { xml: m.xml, scenario: sc, reps: REPS })
    const ref = reference.get(`${series}_${x}`)
    const diff = Object.keys(recs[0].metrics).filter((k) => {
      const a = recs[0].metrics[k]
      const b = ref[k]
      return b === undefined || Math.abs(a - b) > 1e-9 * Math.max(1, Math.abs(b))
    })
    const same = diff.length === 0
    if (!same) {
      mismatches++
      console.log('    differs:', diff.map((k) => `${k} ${recs[0].metrics[k]} vs ${ref[k]}`).join('; '))
    }
    const ms = median(recs.map((r) => r.wallMs))
    rows.push({ runtime: name, series, x, cases: sc.cases, ms, casesPerSecond: (1000 * recs[0].casesStarted) / ms, sameAsNode: same })
    console.log(name, series, x, `${ms.toFixed(1)} ms`, `${Math.round((1000 * recs[0].casesStarted) / ms)} cases/s`, same ? 'same results' : 'DIFFERENT results')
  }
  await browser.close()
}
server.close()

writeFileSync(join(ROOT, 'results', 'v6_browser.json'), JSON.stringify({ reps: REPS, browsers, mismatches, rows }, null, 2))
if (mismatches) process.exitCode = 1
