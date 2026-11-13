// Renders the BPMN test models used in the experiments to PNG figures for the
// appendix and writes the generated models to models/. Needs `esbuild` and
// `bpmn-js` (devDependencies) and a headless Chromium (playwright-core).
import { chromium } from 'playwright-core'
import { layoutProcess } from 'bpmn-auto-layout'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sequence, branches, loop, model } from '../experiments/lib/bpmn.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MODELS = join(ROOT, 'models')
const OUT = join(ROOT, 'paper', 'figures', 'models')
const TMP = join(ROOT, 'tmp', 'render')
const CHROME = join(homedir(), 'Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')

const SIM_SAMPLES = [join(ROOT, 'tools', 'process-simulator'), join(ROOT, '..', 'process-simulator')].map((d) => join(d, 'public/samples/coffee-shop.bpmn'))

mkdirSync(MODELS, { recursive: true })
mkdirSync(OUT, { recursive: true })
mkdirSync(TMP, { recursive: true })

// ---- 1. the generated test models (same builders the experiments use) ----
const generated = {
  'single-station': sequence(1), // V1: M/M/1, M/M/c, M/D/1, M/U/1, M/G/1
  tandem: sequence(2), // V1, V2, V4: two M/M/1 stations in series
  'three-step': sequence(3), // V4 sequence, V5 office process
  'exclusive-choice': branches('xor'), // V2, V4
  'parallel-split': branches('and'), // V2, V4
  'rework-loop': loop(), // V1 Jackson feedback, V2, V4
  composite: model(
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
  ), // V4: choice + parallel + rework
}
for (const [name, m] of Object.entries(generated)) writeFileSync(join(MODELS, name + '.bpmn'), m.xml)

const coffee = SIM_SAMPLES.find(existsSync)
if (!coffee) throw new Error('coffee-shop.bpmn not found; run `make simulator` or keep a checkout next to this repo')
copyFileSync(coffee, join(MODELS, 'coffee-shop.bpmn'))

// ---- 2. a small bpmn-js viewer bundle ----
writeFileSync(
  join(TMP, 'viewer.mjs'),
  `import NavigatedViewer from 'bpmn-js/lib/NavigatedViewer'
window.loadBpmn = async (xml) => {
  const v = new NavigatedViewer({ container: '#c' })
  await v.importXML(xml)
  v.get('canvas').zoom('fit-viewport', 'auto')
  return true
}`,
)
execFileSync(join(ROOT, 'node_modules/.bin/esbuild'), [
  join(TMP, 'viewer.mjs'),
  '--bundle',
  '--format=iife',
  '--outfile=' + join(TMP, 'viewer.js'),
])

// ---- 3. render every model ----
const names = [...Object.keys(generated), 'coffee-shop']
const browser = await chromium.launch({ executablePath: CHROME })
for (const name of names) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 500 }, deviceScaleFactor: 3 })
  await page.setContent('<div id="c" style="width:1400px;height:460px"></div>')
  await page.addScriptTag({ path: join(TMP, 'viewer.js') })
  let xml = readFileSync(join(MODELS, name + '.bpmn'), 'utf8')
  if (!xml.includes('bpmndi:BPMNDiagram')) xml = await layoutProcess(xml)
  await page.evaluate((x) => window.loadBpmn(x), xml)
  const box = await page.evaluate(() => {
    const r = [...document.querySelectorAll('.djs-shape, .djs-connection')].map((e) => e.getBoundingClientRect())
    return { x: Math.min(...r.map((b) => b.left)), y: Math.min(...r.map((b) => b.top)), w: Math.max(...r.map((b) => b.right)), h: Math.max(...r.map((b) => b.bottom)) }
  })
  await page.waitForTimeout(300)
  await page.screenshot({ path: join(OUT, name + '.png'), clip: { x: box.x - 10, y: box.y - 10, width: box.w - box.x + 20, height: box.h - box.y + 20 } })
  await page.close()
}
await browser.close()
console.log('models ->', MODELS)
console.log('figures ->', OUT)
