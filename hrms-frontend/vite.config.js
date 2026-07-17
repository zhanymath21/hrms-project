import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Alias untuk mengarahkan @mui/lab ke @mui/material
      '@mui/lab': '@mui/material',
    }
  },
  optimizeDeps: {
    include: [
      '@mui/material',
      '@mui/icons-material',
      '@mui/x-date-pickers',
      '@emotion/react',
      '@emotion/styled',
      'react',
      'react-dom'
    ],
    // Exclude @mui/lab dari optimization
    exclude: ['@mui/lab']
  },
  server: {
    watch: {
      usePolling: true,
    },
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
})