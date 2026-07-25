import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
    plugins: [vue()],
    server: {
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:8788',
                changeOrigin: true,
            }
        },
        watch: {
            ignored: ['**/functions/**']
        }
    },
    optimizeDeps: {
        entries: ['src/**/*.vue', 'src/**/*.js']
    },
    build: {
        rollupOptions: {
            input: 'index.html'
        }
    }
})