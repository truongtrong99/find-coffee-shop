import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// ADR-0002: the simulation core is plain TypeScript, independent of rendering.
describe('Game Core independence from rendering (ADR-0002)', () => {
  const dir = __dirname
  const sources = readdirSync(dir).filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'))

  it.each(sources)('%s imports nothing from React, three.js, zustand or the app layer', (file) => {
    const imports = [...readFileSync(join(dir, file), 'utf8').matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]!)

    for (const specifier of imports) {
      expect(specifier).not.toMatch(/^(react|react-dom|three|zustand|@react-three\/)/)
      // The core may only import from itself (or Node built-ins), never from the app or content layers.
      expect(specifier).not.toMatch(/^\.\.\//)
    }
  })
})
