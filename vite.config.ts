import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Relative base so built asset URLs resolve under the GitHub Pages
  // project subpath (https://<user>.github.io/GeoWho/) without hardcoding it.
  base: './',
  plugins: [react()],
})
