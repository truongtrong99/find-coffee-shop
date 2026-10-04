// Screenshot the running game in headless Chromium and report browser errors.
// Usage: npm run screenshot -- [--out=screenshots/game.png] [--wait=3000] [--width=1100] [--height=700]
// Exits 1 if the page logged any console error or uncaught exception.
import { parseArgs } from 'node:util'
import { screenshot, withGamePage } from './browser.mjs'

const { values } = parseArgs({
  options: {
    out: { type: 'string', default: 'screenshots/game.png' },
    wait: { type: 'string', default: '3000' },
    width: { type: 'string', default: '1100' },
    height: { type: 'string', default: '700' },
  },
})

await withGamePage({ width: Number(values.width), height: Number(values.height) }, async (page) => {
  await page.waitForTimeout(Number(values.wait))
  await screenshot(page, values.out)
})
