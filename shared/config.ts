import { UTF8, ASCII, BASE64, HEX } from "@shared/constants/encoding.js";
import {
  AES_256_CTR,
  AES_256_GCM,
  CHACHA20_POLY1305,
} from "@shared/constants/cryptography.js";
import type { SupportedAlgorithm } from "@shared/types/crypto.js";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { config } from "dotenv";
import type { Encoding } from "crypto";

const modulePath = dirname(fileURLToPath(import.meta.url));

// Load environment variables
config({ path: resolve(modulePath, "../.env") });

/**
 * Unified Configuration for Will Application
 * Centralizes all configuration constants and settings
 */

// ================================
// TYPE DEFINITIONS
// ================================

interface NetworkRpcConfig {
  current: string | undefined;
  anvil: string | undefined;
  arbitrumSepolia: string | undefined;
  useAnvil: boolean;
}

interface AnvilNetworkConfig {
  chainId: number;
  gasPrice: string;
  blockTime: number;
}

interface ArbitrumSepoliaNetworkConfig {
  chainId: number;
  gasPrice: string;
  blockTime: number;
}

interface NetworkConfig {
  rpc: NetworkRpcConfig;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  gasLimitMultiplier: number;
  confirmationBlocks: number;
  network: string;
  expectedChainIds: number[];
  maxGasPrice: string;
  anvil: AnvilNetworkConfig;
  arbitrumSepolia: ArbitrumSepoliaNetworkConfig;
}

interface CryptoConfig {
  supportedAlgorithms: string[];
  algorithm: SupportedAlgorithm;
  keySize: number;
  ivSize: number;
  maxPlaintextSize: number;
  maxCiphertextSize: number;
  plaintextEncoding: Encoding;
  // ciphertextEncoding: Encoding;
  paths: {
    keyFile: string;
  };
  weakKeyDetection: boolean;
  validateEncodings: boolean;
}

interface SignatureConfig {
  signatureLength: number;
}

interface HashConfig {
  maxInputSize: number;
  supportedEncodings: string[];
}

interface ApprovalConfig {
  maxRetries: number;
  retryDelay: number;
}

interface IpfsPinningConfig {
  retryAttempts: number;
  timeout: number;
  retryDelay: number;
}

interface IpfsConfig {
  pinning: IpfsPinningConfig;
  gateways: string[];
}

interface BasePathsConfig {
  root: string;
  backend: string;
  frontend: string;
  zkp: string;
  contracts: string;
}

interface WillPathsConfig {
  raw: string;
  formatted: string;
  addressed: string;
  signed: string;
  serialized: string;
  encrypted: string;
  downloaded: string;
  decrypted: string;
  deserialized: string;
}

interface ZkpCircuitsFilesConfig {
  wasm: string;
  witness: string;
  input: string;
  zkey: string;
  proof: string;
  public: string;
  verifier: string;
}

interface ZkpPathsConfig {
  multiplier2: ZkpCircuitsFilesConfig;
  cidUpload: ZkpCircuitsFilesConfig;
  willCreation: ZkpCircuitsFilesConfig;
}

interface ContractPathsConfig {
  broadcastDir: string;
  outDir: string;
  multiplier2Verifier: string;
  cidUploadVerifier: string;
  willCreationVerifier: string;
  jsonCidVerifier: string;
  will: string;
  willFactory: string;
}

interface CryptoPathsConfig {
  keyDir: string;
  keyFile: string;
}

interface PathsConfig {
  base: BasePathsConfig;
  will: WillPathsConfig;
  zkp: ZkpPathsConfig;
  env: string;
  contracts: ContractPathsConfig;
  crypto: CryptoPathsConfig;
}

interface SaltConfig {
  defaultSaltBytes: number;
}

interface Permit2Config {
  defaultDuration: number;
  maxNonceBytes: number;
}

interface SerializationConfig {
  maxAmountBytes: number;
}

// ================================
// ENVIRONMENT DETECTION
// ================================
const USE_ANVIL: boolean = process.env.USE_ANVIL === "true";
const NODE_ENV: string = process.env.NODE_ENV || "development";

// ================================
// NETWORK & RPC CONFIG
// ================================
export const NETWORK_CONFIG: NetworkConfig = {
  // RPC configuration
  rpc: {
    current: USE_ANVIL
      ? process.env.ANVIL_RPC_URL
      : process.env.ARB_SEPOLIA_RPC_URL,
    anvil: process.env.ANVIL_RPC_URL,
    arbitrumSepolia: process.env.ARB_SEPOLIA_RPC_URL,
    useAnvil: USE_ANVIL,
  },

  // Connection settings
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 2000, // 2 seconds

  // Gas settings
  gasLimitMultiplier: 1.2,
  confirmationBlocks: USE_ANVIL ? 1 : 2, // Faster confirmation for local network

  // Network validation
  network: USE_ANVIL ? "Anvil Local" : "Arbitrum Sepolia",
  expectedChainIds: USE_ANVIL ? [31337] : [421614], // Anvil local or Arbitrum Sepolia
  maxGasPrice: USE_ANVIL ? "1000000000" : "100000000000", // 1 gwei for local, 100 gwei for testnet

  // Network-specific settings
  anvil: {
    chainId: 31337,
    gasPrice: "1000000000", // 1 gwei
    blockTime: 1, // 1 second block time
  },

  arbitrumSepolia: {
    chainId: 421614,
    gasPrice: "100000000000", // 100 gwei
    blockTime: 0.25, // ~0.25 second block time
  },
};

// ================================
// ENCRYPTION & CRYPTO CONFIG
// ================================
export const CRYPTO_CONFIG: CryptoConfig = {
  // Supported algorithms
  supportedAlgorithms: [AES_256_CTR, AES_256_GCM, CHACHA20_POLY1305],

  // Current algorithm
  algorithm: AES_256_CTR,

  // Key and IV sizes
  keySize: 32, // 256 bits
  ivSize: 16, // 128 bits

  // Security limits
  maxPlaintextSize: 10 * 1024 * 1024, // 10MB
  maxCiphertextSize: 10 * 1024 * 1024, // 10MB

  // Encodings
  plaintextEncoding: "hex",
  // ciphertextEncoding: "number[]",

  // File paths (relative to utils/cryptography/)
  paths: {
    keyFile: "./key.txt",
  },

  // Validation settings
  weakKeyDetection: true,
  validateEncodings: true,
};

// ================================
// SIGNATURE CONFIG
// ================================
export const SIGNATURE_CONFIG: SignatureConfig = {
  // Signature formats
  signatureLength: 130, // 65 bytes
};

// ================================
// HASH CONFIG
// ================================
export const HASH_CONFIG: HashConfig = {
  // Input validation
  maxInputSize: 10 * 1024 * 1024, // 10MB max input size
  supportedEncodings: [UTF8, ASCII, BASE64, HEX],
};

// ================================
// TOKEN APPROVAL CONFIG
// ================================
export const APPROVAL_CONFIG: ApprovalConfig = {
  // Retry settings
  maxRetries: 3,
  retryDelay: 2000, // 2 seconds
};

// ================================
// IPFS CONFIG
// ================================
export const IPFS_CONFIG: IpfsConfig = {
  // Pinning settings (using local Helia instance)
  pinning: {
    retryAttempts: 3,
    timeout: 30000,
    retryDelay: 2000,
  },

  // Gateway URLs (local node prioritized)
  gateways: [
    "http://localhost:8080/ipfs/",
    "https://ipfs.io/ipfs/",
    "https://gateway.ipfs.io/ipfs/",
    "https://cloudflare-ipfs.com/ipfs/",
  ],
};

// ================================
// FILE PATHS CONFIG
// ================================
// Base paths (defined first so they can be reused)
const BASE_PATHS = {
  root: resolve(modulePath, ".."),
  backend: resolve(modulePath, "../apps/backend"),
  frontend: resolve(modulePath, "../apps/frontend"),
  zkp: resolve(modulePath, "../zkp"),
  contracts: resolve(modulePath, "../contracts"),
};

export const PATHS_CONFIG: PathsConfig = {
  // Base paths
  base: BASE_PATHS,

  // Will files
  will: (() => {
    const willDir = resolve(BASE_PATHS.backend, "will");
    const setWillPath = (step: number, name: string) =>
      resolve(willDir, `${step}_${name}.json`);

    return {
      raw: setWillPath(1, "raw"),
      formatted: setWillPath(2, "formatted"),
      addressed: setWillPath(3, "addressed"),
      signed: setWillPath(4, "signed"),
      serialized: setWillPath(5, "serialized"),
      encrypted: setWillPath(6, "encrypted"),
      downloaded: setWillPath(7, "downloaded"),
      decrypted: setWillPath(8, "decrypted"),
      deserialized: setWillPath(9, "deserialized"),
    };
  })(),

  // ZKP files
  zkp: (() => {
    const createZkpConfig = (circuitName: string): ZkpCircuitsFilesConfig => {
      const circuitsDir = resolve(BASE_PATHS.zkp, `circuits/${circuitName}`);
      const dirs = {
        build: resolve(circuitsDir, "build"),
        keys: resolve(circuitsDir, "keys"),
        proofs: resolve(circuitsDir, "proofs"),
        contracts: resolve(circuitsDir, "contracts"),
        inputs: resolve(circuitsDir, "inputs"),
      };

      return {
        wasm: resolve(dirs.build, `${circuitName}_js/${circuitName}.wasm`),
        witness: resolve(dirs.build, `witness.wtns`),
        input: resolve(dirs.inputs, `input.json`),
        zkey: resolve(dirs.keys, `${circuitName}_0001.zkey`),
        proof: resolve(dirs.proofs, `proof.json`),
        public: resolve(dirs.proofs, `public.json`),
        verifier: resolve(dirs.contracts, `verifier.sol`),
      };
    };

    return {
      multiplier2: createZkpConfig("multiplier2"),
      cidUpload: createZkpConfig("cidUpload"),
      willCreation: createZkpConfig("willCreation"),
    };
  })(),

  // Environment files
  env: resolve(modulePath, "../.env"),

  // Contract artifacts
  contracts: {
    broadcastDir: resolve(BASE_PATHS.contracts, "broadcast"),
    outDir: resolve(BASE_PATHS.contracts, "out"),
    multiplier2Verifier: resolve(
      BASE_PATHS.contracts,
      "src/Multiplier2Verifier.sol",
    ),
    cidUploadVerifier: resolve(
      BASE_PATHS.contracts,
      "src/CidUploadVerifier.sol",
    ),
    willCreationVerifier: resolve(
      BASE_PATHS.contracts,
      "src/WillCreationVerifier.sol",
    ),
    jsonCidVerifier: resolve(BASE_PATHS.contracts, "src/JsonCidVerifier.sol"),
    will: resolve(BASE_PATHS.contracts, "src/Will.sol"),
    willFactory: resolve(BASE_PATHS.contracts, "src/WillFactory.sol"),
  },

  // Crypto keys
  crypto: {
    keyDir: resolve(modulePath, "utils/cryptography"),
    keyFile: resolve(modulePath, "utils/cryptography/key.txt"),
  },
};

// ================================
// SALT GENERATION CONFIG
// ================================
export const SALT_CONFIG: SaltConfig = {
  defaultSaltBytes: 32,
};

// ================================
// PERMIT2 CONFIG
// ================================
export const PERMIT2_CONFIG: Permit2Config = {
  // Default duration
  defaultDuration: 100 * 365 * 24 * 60 * 60 * 1000, // 100 year in milliseconds

  // Nonce generation
  maxNonceBytes: 16,
};

// ================================
// SERIALIZATION CONFIG
// ================================
export const SERIALIZATION_CONFIG: SerializationConfig = {
  // amount serialization
  maxAmountBytes: 16, // max amount = 2**128
};

// ================================
// EXPORT DEFAULT CONFIG
// ================================
export default {
  NETWORK_CONFIG,
  CRYPTO_CONFIG,
  SIGNATURE_CONFIG,
  HASH_CONFIG,
  APPROVAL_CONFIG,
  IPFS_CONFIG,
  PATHS_CONFIG,
  SALT_CONFIG,
  PERMIT2_CONFIG,
  SERIALIZATION_CONFIG,
};
