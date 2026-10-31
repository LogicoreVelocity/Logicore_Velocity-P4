import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.tsx', 'src/**/*.test.ts', 'src/**/*.spec.tsx', 'src/**/*.spec.ts'],
    exclude: ['node_modules', 'dist', 'scripts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
});
