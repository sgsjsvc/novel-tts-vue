import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8888', // 后端接口地址
        changeOrigin: true,              // 修改请求头中的 Origin
        rewrite: (path) => path.replace(/^\/api/, '/api'), // 可选: 保留/api前缀
      },
      '/ws': {
        target: 'ws://127.0.0.1:8888',   // WebSocket 服务
        ws: true,                        // 启用 WebSocket 代理
        changeOrigin: true,
      },
    }
  }
})

