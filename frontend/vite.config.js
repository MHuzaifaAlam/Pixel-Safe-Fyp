import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // This handles the v4 styling engine
  ],
  server: {
    host: true,
    port: 5173,
    watch: {
      // Prevents loops when backend files or DB change
      ignored: ['**/backend/**', '**/media/**', '**/db.sqlite3'],
    },
  },
});