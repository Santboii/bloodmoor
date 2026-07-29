import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: { '@arena/shared': resolve(__dirname, '../shared/src/index.ts') },
  },
  build: {
    rollupOptions: {
      output: {
        // Split the heavy stable dependencies from app code so they download
        // in parallel and stay browser-cached across app deploys.
        manualChunks: {
          three: ['three'],
          vendor: ['socket.io-client', '@supabase/supabase-js'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/rooms': 'http://localhost:3000',
      '/paused-match': 'http://localhost:3000',
      '/socket.io': { target: 'http://localhost:3000', ws: true },
    },
  },
});
