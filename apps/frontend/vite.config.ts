import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load root .env file
const rootEnvPath = path.resolve(__dirname, '../../.env');
let rootEnv: Record<string, string> = {};

try {
  const envContent = readFileSync(rootEnvPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^=#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      rootEnv[key] = value;
    }
  });
} catch (error) {
  console.warn('Could not load root .env file:', error);
}

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Enable specific polyfills
      include: ['path', 'buffer', 'process', 'util', 'url', 'stream', 'crypto'],
      // Inject global variables
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@types': path.resolve(__dirname, './src/types'),
      '@shared': path.resolve(__dirname, '../../shared'),
      '@config': path.resolve(__dirname, '../../shared/config.ts'),
    },
  },
  define: {
    // Global polyfills
    global: 'globalThis',
    // Inject contract addresses from root .env
    'import.meta.env.VITE_PERMIT2': JSON.stringify(rootEnv.PERMIT2 || ''),
    'import.meta.env.VITE_WILL_FACTORY': JSON.stringify(rootEnv.WILL_FACTORY || ''),
    'import.meta.env.VITE_CID_UPLOAD_VERIFIER': JSON.stringify(rootEnv.CID_UPLOAD_VERIFIER || ''),
    'import.meta.env.VITE_WILL_CREATION_VERIFIER': JSON.stringify(rootEnv.WILL_CREATION_VERIFIER || ''),
    'import.meta.env.VITE_JSON_CID_VERIFIER': JSON.stringify(rootEnv.JSON_CID_VERIFIER || ''),
    'import.meta.env.VITE_CHAIN_ID': JSON.stringify('421614'),
    'import.meta.env.VITE_RPC_URL': JSON.stringify('https://sepolia-rollup.arbitrum.io/rpc'),
    'import.meta.env.VITE_NETWORK_NAME': JSON.stringify('Arbitrum Sepolia'),
    'import.meta.env.VITE_BLOCK_EXPLORER': JSON.stringify('https://sepolia.arbiscan.io'),
    'import.meta.env.VITE_BACKEND_URL': JSON.stringify(`http://localhost:${rootEnv.BACKEND_PORT || '3001'}`),
    // Default will data from .env
    'import.meta.env.VITE_DEFAULT_EXECUTOR': JSON.stringify(rootEnv.EXECUTOR || ''),
    'import.meta.env.VITE_DEFAULT_WITNESS1': JSON.stringify(rootEnv.WITNESS1 || ''),
    'import.meta.env.VITE_DEFAULT_WITNESS2': JSON.stringify(rootEnv.WITNESS2 || ''),
    'import.meta.env.VITE_DEFAULT_BENEFICIARY0': JSON.stringify(rootEnv.BENEFICIARY0 || ''),
    'import.meta.env.VITE_DEFAULT_TOKEN0': JSON.stringify(rootEnv.TOKEN0 || ''),
    'import.meta.env.VITE_DEFAULT_AMOUNT0': JSON.stringify(rootEnv.AMOUNT0 || ''),
    'import.meta.env.VITE_DEFAULT_BENEFICIARY1': JSON.stringify(rootEnv.BENEFICIARY1 || ''),
    'import.meta.env.VITE_DEFAULT_TOKEN1': JSON.stringify(rootEnv.TOKEN1 || ''),
    'import.meta.env.VITE_DEFAULT_AMOUNT1': JSON.stringify(rootEnv.AMOUNT1 || ''),
  },
  server: {
    port: 5173,
  },
  optimizeDeps: {
    include: ['@uniswap/permit2-sdk'],
  },
});
