import { defineConfig } from 'vite';

export default defineConfig({
  // Serve both index.html and admin.html as entries
  root: '.',
  build: {
    rollupOptions: {
      input: {
        main:  'index.html',
        admin: 'admin.html',
      },
    },
  },
  server: {
    port: 3000,
    open: '/index.html',
  },
});
