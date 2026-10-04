import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Relative asset paths so the static build works from any sub-path.
  base: './',
  plugins: [react()],
  // three.js and React Three Fiber put the single static bundle at ~1.2 MB minified; warn only well past that.
  build: { chunkSizeWarningLimit: 1500 },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
