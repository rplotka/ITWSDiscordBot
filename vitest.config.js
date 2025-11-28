import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'test/**',
        'vitest.config.js',
        'deploy-commands.js',
      ],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
