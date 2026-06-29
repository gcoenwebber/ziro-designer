import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// On GitHub Pages the app is served from https://<user>.github.io/<repo>/, so the
// asset base must be the repo subpath. Locally it stays '/'. The CI workflow sets
// VITE_BASE=/pcb/.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  server: { port: 5173 },
});
