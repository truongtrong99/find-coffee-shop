// Screenshot the running game in headless Chromium and report browser errors.
// Usage: npm run screenshot -- [--out=screenshots/game.png] [--wait=3000] [--width=1100] [--height=700]
// Exits 1 if the page logged any console error or uncaught exception.
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { parseArgs } from 'node:util'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const { values } = parseArgs({
  options: {
    out: { type: 'string', default: 'screenshots/game.png' },
    wait: { type: 'string', default: '3000' },
    width: { type: 'string', default: '1100' },
    height: { type: 'string', default: '700' },
  },
})

const server = await createServer({ server: { port: 0 }, logLevel: 'error' })
await server.listen()
const url = server.resolvedUrls.local[0]

// SwiftShader gives headless Chromium a software WebGL context.
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const errors = []
try {
  const page = await browser.newPage({ viewport: { width: Number(values.width), height: Number(values.height) } })
  page.on('pageerror', (error) => errors.push(`uncaught: ${error.message}`))
  page.on('console', (message) => message.type() === 'error' && errors.push(`console: ${message.text()}`))

  await page.goto(url)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(Number(values.wait))

  mkdirSync(dirname(values.out), { recursive: true })
  await page.screenshot({ path: values.out })
  console.log(`Screenshot: ${values.out}`)
} finally {
  await browser.close()
  await server.close()
}

if (errors.length > 0) {
  console.log(`Browser errors (${errors.length}):\n${errors.map((e) => `  ${e}`).join('\n')}`)
  process.exitCode = 1
} else {
  console.log('Browser errors: none')
}
