import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(rootDir, 'index.html'),
        business: resolve(rootDir, 'business/index.html'),
        pricing: resolve(rootDir, 'pricing/index.html'),
        security: resolve(rootDir, 'security/index.html'),
        console: resolve(rootDir, 'console/index.html'),
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
