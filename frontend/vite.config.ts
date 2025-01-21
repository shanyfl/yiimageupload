import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig((mode)=>{
  process.env = {...process.env, ...loadEnv(mode as unknown as string, process.cwd())};
  const isProduction = process.env.NODE_ENV === 'production';
  const SERVER_URL = isProduction ? process.env.VITE_PROD_SERVER_URL : process.env.VITE_DEV_SERVER_URL;
  console.log('SERVER_URL:', SERVER_URL);
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: SERVER_URL, // or wherever your Node server runs
          changeOrigin: true,
        },
      },
    }
  }
})
