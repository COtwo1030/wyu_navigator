import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';

export default defineConfig({
  plugins: [uni()],
  server: {
    proxy: {
      '/qqmap': {
        target: 'https://apis.map.qq.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/qqmap/, ''),
      },
    },
  },
});