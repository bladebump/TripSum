import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: false, // 不自动打开分析报告
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html'
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler'
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2015', // 设置目标浏览器
    cssCodeSplit: true, // CSS 代码分割
    sourcemap: false, // 生产环境关闭 sourcemap
    minify: 'terser', // 使用 terser 压缩
    terserOptions: {
      compress: {
        drop_console: true, // 移除 console
        drop_debugger: true, // 移除 debugger
        pure_funcs: ['console.log', 'console.info'], // 移除特定函数调用
      },
      format: {
        comments: false, // 移除注释
      },
    },
    reportCompressedSize: false, // 关闭 gzip 报告加快构建
    chunkSizeWarningLimit: 500, // chunk 大小警告限制
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // 更细粒度的代码分割
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor'
            }
            if (id.includes('antd-mobile')) {
              return 'antd-mobile'
            }
            if (id.includes('recharts')) {
              return 'charts'
            }
            if (id.includes('lodash') || id.includes('dayjs') || id.includes('decimal.js')) {
              return 'utils'
            }
            if (id.includes('axios') || id.includes('socket.io')) {
              return 'network'
            }
            // 其他第三方库
            return 'vendor'
          }
        },
        // 优化chunk命名
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
  },
})