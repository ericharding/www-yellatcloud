import { defineConfig } from 'vitest/config';
import solid from 'vite-plugin-solid';

const serverOrigin = 'http://localhost:3000';

export default defineConfig({
  plugins: [solid()],
  root: 'src/client',
  publicDir: '../../public',
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': serverOrigin,
      '/i': serverOrigin,
    },
  },
  test: {
    root: '.',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
