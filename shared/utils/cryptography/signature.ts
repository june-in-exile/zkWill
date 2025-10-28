import {
  type Permit2Data,
} from "@shared/types/blockchain.js";
import {
  validateEthereumAddress,
  validateSignature,
} from "@shared/utils/validation/blockchain.js";
import { keccak256 } from "@shared/utils/cryptography/keccak256.js";
import { createWallet } from "@shared/utils/blockchain.js";
import { ethers } from "ethers";

// Lazy loading for Permit2 SDK
// This is needed because the SDK is CommonJS and needs different loading strategies
let SignatureTransfer: any = null;

/**
 * Load Permit2 SDK (lazy initialization)
 * Handles both Node.js (CommonJS) and browser (ESM) environments
 */
async function loadPermit2SDK() {
  if (SignatureTransfer) return SignatureTransfer;

  if (typeof window === 'undefined') {
    // Node.js environment - use createRequire for CommonJS
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const permit2SDK = require("@uniswap/permit2-sdk");
    SignatureTransfer = permit2SDK.SignatureTransfer;
  } else {
    // Browser environment - dynamic import
    const permit2Module = await import('@uniswap/permit2-sdk');
    SignatureTransfer = (permit2Module as any).SignatureTransfer;
  }

  return SignatureTransfer;
}

/**
 * Sign string message
 */
async function signString(
  message: string,
  privateKey: string,
): Promise<string> {
  try {
    // Create wallet instance
    const wallet = createWallet(privateKey);

    // Hash the message
    const hash = keccak256(message);
    const hashBytes = ethers.getBytes(hash);
    if (!hashBytes || hashBytes.length !== 32) {
      throw new Error("Invalid hash bytes generated");
    }

    // Perform signing
    const signature = await wallet.signMessage(hashBytes);

    // Validate signature format
    validateSignature(signature);

    // Additional validation - verify signature immediately
    const signerAddress = wallet.address;
    const isValid = await verify(message, signature, signerAddress);

    if (!isValid) {
      throw new Error("Generated signature failed immediate verification");
    }

    return signature;
  } catch (error) {
    throw new Error(
      `String signing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Verify signature
 */
async function verify(
  message: string,
  signature: string,
  expectedSigner: string,
): Promise<boolean> {
  try {
    if (!validateEthereumAddress(expectedSigner)) {
      throw new Error(`Invalid Ethereum address format: ${expectedSigner}`);
    }

    const recoveredAddress = await recoverSigner(message, signature);

    const normalizedExpectedSigner = expectedSigner.toLocaleLowerCase();
    const normalizedRecovered = recoveredAddress.toLowerCase();

    const isValid = normalizedRecovered === normalizedExpectedSigner;

    return isValid;
  } catch (error) {
    throw new Error(
      `Signature verification failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Recover signer address from signature
 */
async function recoverSigner(
  message: string,
  signature: string,
): Promise<string> {
  try {
    validateSignature(signature);

    // Hash the message
    const hash = keccak256(message);
    const hashBytes = ethers.getBytes(hash);
    if (!hashBytes || hashBytes.length !== 32) {
      throw new Error("Invalid hash bytes generated");
    }

    // Recover address
    const recoveredAddress = ethers.verifyMessage(hashBytes, signature);

    // Validate recovered address
    if (!validateEthereumAddress(recoveredAddress)) {
      throw new Error("Failed to recover valid address from signature");
    }

    return recoveredAddress;
  } catch (error) {
    throw new Error(
      `Signer recovery failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Sign EIP-712 typed data (generic function)
 * This is the core signing function shared between frontend and backend
 *
 * @param domain - EIP-712 domain
 * @param types - EIP-712 types
 * @param values - EIP-712 values
 * @param signer - Ethers signer (can be Wallet or JsonRpcSigner)
 * @returns Signature string
 */
async function signTypedData(
  domain: any,
  types: any,
  values: any,
  signer: ethers.Signer,
): Promise<string> {
  try {
    // Sign using ethers.js signTypedData
    // This is the standard way that works for both Wallet and JsonRpcSigner
    const signature = await signer.signTypedData(domain, types, values);

    return signature;
  } catch (error) {
    throw new Error(
      `Typed data signature failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Sign Permit2 data using EIP-712 (Node.js only)
 * This function uses SignatureTransfer.getPermitData from @uniswap/permit2-sdk
 * For frontend use, call signTypedData with the result of SignatureTransfer.getPermitData
 *
 * @param permit - Permit2 data structure
 * @param permit2Address - Address of Permit2 contract
 * @param chainId - Chain ID (as number or bigint)
 * @param signer - Ethers signer (can be Wallet or JsonRpcSigner)
 * @returns Signature string
 */
async function signPermit2(
  permit: Permit2Data,
  permit2Address: string,
  chainId: number | bigint,
  signer: ethers.Signer,
): Promise<string> {
  try {
    // Load Permit2 SDK lazily
    const SDK = await loadPermit2SDK();
    if (!SDK) {
      throw new Error('Failed to load Permit2 SDK');
    }

    // Get EIP-712 typed data from Permit2 SDK
    const { domain, types, values } = SDK.getPermitData(
      permit,
      permit2Address,
      chainId,
    );

    // Use the generic signTypedData function
    return await signTypedData(domain, types, values, signer);
  } catch (error) {
    throw new Error(
      `Permit2 signature failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export { signString, verify, recoverSigner, signTypedData, signPermit2 };
