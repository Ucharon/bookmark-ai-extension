import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import path, { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [preact(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        background: resolve(__dirname, 'src/background.ts'),
        contentScript: resolve(__dirname, 'src/contentScript.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
}); 