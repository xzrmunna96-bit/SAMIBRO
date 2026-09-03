import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      target: 'esnext',
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('firebase')) {
                return 'firebase-vendor';
              }
              if (id.includes('lucide-react')) {
                return 'lucide-vendor';
              }
              if (id.includes('react')) {
                return 'react-vendor';
              }
              return 'vendor';
            }
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api/voltx': {
          target: 'https://api.2oo9.cloud/MXS47FLFX0U/tnevs',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/voltx/, ''),
          secure: false,
          headers: {
            'Origin': 'https://voltxsms.com',
            'Referer': 'https://voltxsms.com/m29/',
          }
        },
      },
    },
  };
});
