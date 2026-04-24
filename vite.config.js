import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    rollupOptions: {
      input: {
        main:    'index.html',      // Login page (entry point)
        library: 'library.html',    // Library / Dashboard
        admin:   'admin.html',      // Admin panel
      },
    },
  },
  server: {
    port: 3000,
    open: '/',  // Opens index.html (the login page) by default
  },
});
