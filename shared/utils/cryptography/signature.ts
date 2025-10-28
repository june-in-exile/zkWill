import { type Permit2Data } from "@shared/types/blockchain.js";
import {
  validateEthereumAddress,
  validateSignature,
} from "@shared/utils/validation/blockchain.js";
import { keccak256 } from "@shared/utils/cryptography/keccak256.js";
import { createWallet } from "@shared/utils/blockchain.js";
import { ethers } from "ethers";
import chalk from "chalk";

/**
 * Load Permit2 SDK (lazy initialization)
 * Handles both Node.js (CommonJS) and browser (ESM) environments
 */
async function loadPermit2SDK() {
  let permit2SDK;

  if (typeof window === 'undefined') {
    // Node.js environment - use createRequire for CommonJS
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    permit2SDK = require("@uniswap/permit2-sdk");
  } else {
    // Browser environment - dynamic import
    permit2SDK = await import('@uniswap/permit2-sdk');
  }

  return permit2SDK;
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
 * @param signer - Ethers signer (can be Wallet or JsonRpcSigner)
 * @param chainId - Chain ID (as number or bigint)
 * @returns Signature string
 */
async function signPermit2(
  permit: Permit2Data,
  signer: ethers.Signer,
  chainId: number | bigint,
): Promise<string> {
  try {
    console.log(chalk.blue("Generating EIP-712 signature..."));

    // Load Permit2 SDK lazily
    const permit2SDK = await loadPermit2SDK();
    if (!permit2SDK) {
      throw new Error('Failed to load Permit2 SDK');
    }

    const { SignatureTransfer, PERMIT2_ADDRESS } = permit2SDK;

    // Get EIP-712 typed data from Permit2 SDK
    const { domain, types, values } = SignatureTransfer.getPermitData(
      permit,
      PERMIT2_ADDRESS,
      chainId,
    );
    const signature = await signer.signTypedData(domain, types, values);

    console.log(chalk.green("✅ Signature generated successfully"));

    return signature;
  } catch (error) {
    throw new Error(
      `Permit2 signature failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export { signString, verify, recoverSigner, signTypedData, signPermit2 };
