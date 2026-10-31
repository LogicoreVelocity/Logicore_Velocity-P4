import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.tsx', 'src/**/*.test.ts', 'src/**/*.spec.tsx', 'src/**/*.spec.ts'],
    exclude: ['node_modules', 'dist', 'scripts'],
    environment: 'jsdom',
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
});
