import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  build: {
    rollupOptions: {
      input: {
        main: './index.html', // Main HTML file
        config: './config.html', // Additional HTML file
      },
    },
  },
});
