import { defineConfig } from 'vite';
import { vitePlugin as remix } from '@remix-run/dev';
import { installGlobals } from '@remix-run/node';
import tsconfigPaths from 'vite-tsconfig-paths';

installGlobals();

export default defineConfig({
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
      },
    }),
    tsconfigPaths(),
  ],
  css: {
    postcss: './postcss.config.js',
  },
  server: {
    port: 3000,
    host: true,
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      '@trpc/client', 
      '@trpc/react-query'
    ],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
  esbuild: {
    target: 'node14',
  },
});
