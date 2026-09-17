import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.spec.{ts,tsx}'],
    environmentMatchGlobs: [
      ['src/location-sync.spec.ts', 'jsdom'],
      ['src/**/*.spec.tsx', 'jsdom'],
    ],
  },
});
