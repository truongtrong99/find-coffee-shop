// Shared setup for scripts that drive the running game in headless Chromium.
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { chromium } from 'playwright'
import { createServer } from 'vite'

/**
 * Serves the game with Vite, opens it in headless Chromium and runs `drive(page)`, then reports.
 * Sets a non-zero exit code if `drive` throws or the page logged any console error or uncaught exception.
 */
export async function withGamePage({ width = 1100, height = 700 }, drive) {
  const server = await createServer({ server: { port: 0 }, logLevel: 'error' })
  await server.listen()
  const url = server.resolvedUrls.local[0]

  // SwiftShader gives headless Chromium a software WebGL context.
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
  const errors = []
  try {
    const page = await browser.newPage({ viewport: { width, height } })
    page.on('pageerror', (error) => errors.push(`uncaught: ${error.message}`))
    page.on('console', (message) => message.type() === 'error' && errors.push(`console: ${message.text()}`))

    await page.goto(url)
    await page.waitForSelector('canvas')
    await drive(page)
  } catch (error) {
    console.log(`Failed: ${error.message}`)
    process.exitCode = 1
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
}

/** Screenshots the page to `path`, creating its directory. */
export async function screenshot(page, path) {
  mkdirSync(dirname(path), { recursive: true })
  await page.screenshot({ path })
  console.log(`Screenshot: ${path}`)
}
