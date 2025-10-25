/**
 * Contract addresses and configuration
 * Read from environment variables (VITE_ prefix required)
 */

export const CONTRACT_ADDRESSES = {
  PERMIT2: import.meta.env.VITE_PERMIT2,
  WILL_FACTORY: import.meta.env.VITE_WILL_FACTORY,
  CID_UPLOAD_VERIFIER: import.meta.env.VITE_CID_UPLOAD_VERIFIER,
  WILL_CREATION_VERIFIER: import.meta.env.VITE_WILL_CREATION_VERIFIER,
  JSON_CID_VERIFIER: import.meta.env.VITE_JSON_CID_VERIFIER,
} as const;

export const NETWORK_CONFIG = {
  CHAIN_ID: Number(import.meta.env.VITE_CHAIN_ID) || 31337,
  RPC_URL: import.meta.env.VITE_RPC_URL || 'http://127.0.0.1:8545',
} as const;

// Validate that all required addresses are set
export const validateContractAddresses = () => {
  const missing: string[] = [];

  Object.entries(CONTRACT_ADDRESSES).forEach(([key, value]) => {
    if (!value || value === 'YOUR_DEPLOYED_FACTORY_ADDRESS') {
      missing.push(key);
    }
  });

  if (missing.length > 0) {
    console.warn('Missing contract addresses:', missing);
    console.warn('Please update your .env file with deployed contract addresses');
  }

  return missing.length === 0;
};

// Helper to get contract address by name
export const getContractAddress = (contractName: keyof typeof CONTRACT_ADDRESSES): string => {
  const address = CONTRACT_ADDRESSES[contractName];
  if (!address) {
    throw new Error(`Contract address not found for: ${contractName}`);
  }
  return address;
};
