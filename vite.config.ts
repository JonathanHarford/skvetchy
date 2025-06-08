import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => ({
  plugins: [svelte()],
  base: command === 'build' ? '/skvetchy/' : '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
}))
