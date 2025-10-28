/**
 * Permit2 signature generation utilities
 * Uses Uniswap Permit2 SDK to create EIP-712 signatures
 */

import { ethers } from 'ethers';
import { SignatureTransfer, PERMIT2_ADDRESS } from '@uniswap/permit2-sdk';
import { CONTRACT_ADDRESSES } from '@/config/contracts';
import type { WillData } from '@pages/testator/TestatorPage';
import { signTypedData as sharedSignTypedData } from '@shared/utils/cryptography/signature.js';

export interface PermittedToken {
  token: string;
  amount: bigint;
}

export interface Permit2Data {
  permitted: PermittedToken[];
  spender: string; // Will contract address
  nonce: bigint;
  deadline: number; // Should be number, not bigint (matches backend)
}

export interface SignatureResult {
  nonce: bigint;
  deadline: number; // Should be number, not bigint (matches backend)
  signature: string;
}

/**
 * Generate a random nonce for Permit2
 * Uses 16 bytes (128 bits) of randomness
 */
export const generateNonce = (): bigint => {
  // Generate 16 random bytes
  const randomBytes = ethers.randomBytes(16);
  return BigInt('0x' + ethers.hexlify(randomBytes).slice(2));
};

/**
 * Calculate permit deadline
 * Default: 100 years from now (for long-lived wills)
 */
export const calculateDeadline = (durationMs: number = 100 * 365 * 24 * 60 * 60 * 1000): number => {
  const endTimeMs = Date.now() + durationMs;
  return Math.floor(endTimeMs / 1000); // Convert to seconds (matches backend)
};

/**
 * Create permit structure from will data
 */
export const createPermitStructure = (
  willData: WillData,
  willContractAddress: string,
  nonce: bigint,
  deadline: number
): Permit2Data => {
  const permitted: PermittedToken[] = willData.estates.map((estate) => ({
    token: estate.token,
    amount: BigInt(estate.amount),
  }));

  return {
    permitted,
    spender: willContractAddress,
    nonce,
    deadline,
  };
};

/**
 * Helper function to convert all BigInt values to strings recursively
 */
const convertBigIntToString = (obj: any): any => {
  if (typeof obj === 'bigint') {
    return obj.toString();
  } else if (Array.isArray(obj)) {
    return obj.map(convertBigIntToString);
  } else if (obj !== null && typeof obj === 'object') {
    const converted: any = {};
    for (const key in obj) {
      converted[key] = convertBigIntToString(obj[key]);
    }
    return converted;
  }
  return obj;
};

/**
 * Sign permit using EIP-712
 * Returns signature that can be used with Permit2 SignatureTransfer
 * Uses the same logic as backend (signPermit) for signature compatibility
 */
export const signPermit2 = async (
  permit: Permit2Data,
  signer: ethers.JsonRpcSigner,
  chainId?: number
): Promise<SignatureResult> => {
  try {
    // Get chain ID from parameter or provider
    let resolvedChainId: number;
    if (chainId !== undefined) {
      resolvedChainId = chainId;
    } else {
      const provider = signer.provider;
      const network = await provider.getNetwork();
      resolvedChainId = Number(network.chainId);
    }

    // Use Permit2 address from config, fallback to SDK default
    const permit2Address = CONTRACT_ADDRESSES.PERMIT2 || PERMIT2_ADDRESS;

    // Get EIP-712 typed data from Permit2 SDK
    const { domain, types, values } = SignatureTransfer.getPermitData(
      permit,
      permit2Address,
      resolvedChainId
    );

    console.log('🔐 Frontend signing with:');
    console.log('domain:', domain);
    console.log('types:', JSON.stringify(types, null, 2));
    console.log('values:', JSON.stringify(values, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2));

    // Use the shared signTypedData function to ensure consistency with backend
    const signature = await sharedSignTypedData(domain, types, values, signer);

    console.log('✅ Frontend signature generated:', signature);

    return {
      nonce: permit.nonce,
      deadline: permit.deadline,
      signature,
    };
  } catch (error) {
    console.error('Failed to sign permit:', error);
    throw new Error(
      `Permit2 signature failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

/**
 * Generate complete Permit2 signature for will
 * Combines nonce generation, deadline calculation, and signing
 */
export const generateWillPermit2Signature = async (
  willData: WillData,
  willContractAddress: string,
  signer: ethers.JsonRpcSigner,
  chainId?: number
): Promise<SignatureResult> => {
  // Generate nonce and deadline
  const nonce = generateNonce();
  const deadline = calculateDeadline();

  // Create permit structure
  const permit = createPermitStructure(willData, willContractAddress, nonce, deadline);
  
  // Sign permit (pass chainId to avoid network call)
  return await signPermit2(permit, signer, chainId);
};
