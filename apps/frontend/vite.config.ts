import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

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
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@types': path.resolve(__dirname, './src/types'),
      '@shared': path.resolve(__dirname, '../../shared'),
    },
  },
  define: {
    // Inject contract addresses from root .env
    'import.meta.env.VITE_PERMIT2': JSON.stringify(rootEnv.PERMIT2 || ''),
    'import.meta.env.VITE_WILL_FACTORY': JSON.stringify(rootEnv.WILL_FACTORY || ''),
    'import.meta.env.VITE_CID_UPLOAD_VERIFIER': JSON.stringify(rootEnv.CID_UPLOAD_VERIFIER || ''),
    'import.meta.env.VITE_WILL_CREATION_VERIFIER': JSON.stringify(rootEnv.WILL_CREATION_VERIFIER || ''),
    'import.meta.env.VITE_JSON_CID_VERIFIER': JSON.stringify(rootEnv.JSON_CID_VERIFIER || ''),
    'import.meta.env.VITE_CHAIN_ID': JSON.stringify('31337'),
    'import.meta.env.VITE_RPC_URL': JSON.stringify(rootEnv.ANVIL_RPC_URL || 'http://127.0.0.1:8545'),
  },
  server: {
    port: 5173,
  },
  optimizeDeps: {
    exclude: ['snarkjs'],
  },
});
