import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development'
  const isProduction = mode === 'production'
  
  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      proxy: isDev ? {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        }
      } : {}
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: !isProduction, // 프로덕션에서는 소스맵 생성 안함
      minify: isProduction,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
          },
        },
      },
    },
    define: {
      // 프로덕션에서 console 제거 (개발 중에만 제거, 실제로는 주석처리)
      // ...(isProduction && {
      //   'console.log': '(() => {})',
      //   'console.warn': '(() => {})', 
      //   'console.error': '(() => {})',
      // }),
    },
  }
})
