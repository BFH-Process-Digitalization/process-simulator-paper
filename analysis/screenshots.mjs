// Screenshots of the web app for the manuscript: the tool in simulate mode and
// the value stream view. Requires the built app on http://localhost:4173
// (`vite preview` in tools/process-simulator or the checked-out simulator repo).
import { chromium } from 'playwright-core'
import { homedir } from 'node:os'
import { mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'paper', 'figures')
const APP = process.env.APP_URL ?? 'http://localhost:4173/'
const CHROME = join(homedir(), 'Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')

mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ executablePath: CHROME })
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 })

// open the value stream tab straight away
await page.addInitScript(() => {
  localStorage.setItem('process-simulator:results-height', '48')
  localStorage.setItem('process-simulator:results-tab', 'value')
})
await page.goto(APP, { waitUntil: 'networkidle' })
await page.waitForSelector('g.djs-element', { timeout: 15000 })
await page.waitForTimeout(600)

// 1. simulate view with the coffee-shop example loaded
await page.screenshot({ path: join(OUT, 'app-simulate.png') })

// 2. run the baseline scenario, results drawer opens with the value stream tab
await page.getByRole('button', { name: 'Run simulation' }).click()
await page.waitForSelector('.drawer.open .results', { timeout: 120000 })
await page.waitForTimeout(800)
const box = await page.locator('.results').boundingBox()
await page.screenshot({ path: join(OUT, 'value-stream.png'), clip: { ...box } })

// 3. same run with the numeric results tab for context
await page.getByRole('tab', { name: 'Results' }).click()
await page.waitForTimeout(400)
await page.screenshot({ path: join(OUT, 'app-results.png') })

await browser.close()
console.log('wrote', OUT)
