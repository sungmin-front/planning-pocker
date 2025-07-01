import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 120000,
    hookTimeout: 60000,
    teardownTimeout: 30000,
    maxConcurrency: 1, // Run E2E tests sequentially to avoid port conflicts
    retry: 1,
    include: ['**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    reporters: ['verbose'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.test.ts',
        '**/setup.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../')
    }
  }
});