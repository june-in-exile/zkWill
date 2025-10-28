import { ExternalProvider } from 'ethers';
import type { Buffer } from 'buffer';

declare global {
  interface Window {
    ethereum?: ExternalProvider & {
      isMetaMask?: boolean;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
    };
    Buffer: typeof Buffer;
    process: NodeJS.Process;
  }

  // Make NodeJS types available in browser context
  namespace NodeJS {
    interface Process {
      env: any;
    }
  }
}

export {};
