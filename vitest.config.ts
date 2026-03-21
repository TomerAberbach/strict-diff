import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: `jsdom`,
    coverage: {
      include: [`src`],
      exclude: [`*.bench.ts`],
    },
    chaiConfig: {
      truncateThreshold: Infinity,
    },
  },
})
