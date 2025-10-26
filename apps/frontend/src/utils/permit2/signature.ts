/**
 * Permit2 signature generation utilities
 * Uses Uniswap Permit2 SDK to create EIP-712 signatures
 */

import { ethers } from 'ethers';
import { SignatureTransfer, PERMIT2_ADDRESS } from '@uniswap/permit2-sdk';
import { CONTRACT_ADDRESSES } from '@/config/contracts';
import type { WillData } from '@pages/testator/TestatorPage';

export interface PermittedToken {
  token: string;
  amount: string | bigint;
}

export interface Permit2Data {
  permitted: PermittedToken[];
  spender: string; // Will contract address
  nonce: string | bigint;
  deadline: number;
}

export interface SignatureResult {
  nonce: bigint;
  deadline: number;
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
  return Math.floor(endTimeMs / 1000); // Convert to seconds
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
  const permitted: PermittedToken[] = willData.beneficiaries.map((beneficiary) => ({
    token: beneficiary.token,
    amount: beneficiary.amount,
  }));

  return {
    permitted,
    spender: willContractAddress,
    nonce,
    deadline,
  };
};

/**
 * Sign permit using EIP-712
 * Returns signature that can be used with Permit2 SignatureTransfer
 */
export const signPermit2 = async (
  permit: Permit2Data,
  signer: ethers.JsonRpcSigner
): Promise<SignatureResult> => {
  try {
    // Get chain ID
    const provider = signer.provider;
    const network = await provider.getNetwork();
    const chainId = network.chainId;

    // Use Permit2 address from config, fallback to SDK default
    const permit2Address = CONTRACT_ADDRESSES.PERMIT2 || PERMIT2_ADDRESS;

    console.log('Generating Permit2 signature...');
    console.log('Chain ID:', chainId.toString());
    console.log('Permit2 Address:', permit2Address);
    console.log('Spender (Will):', permit.spender);
    console.log('Tokens:', permit.permitted.length);
    console.log('Nonce:', permit.nonce.toString());
    console.log('Deadline:', new Date(Number(permit.deadline) * 1000).toISOString());

    // Get EIP-712 typed data
    const { domain, types, values } = SignatureTransfer.getPermitData(
      permit as any,
      permit2Address,
      chainId
    );

    // Sign using EIP-712
    const signature = await signer.signTypedData(domain, types, values);

    console.log('Signature generated successfully!');

    return {
      nonce: BigInt(permit.nonce),
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
  signer: ethers.JsonRpcSigner
): Promise<SignatureResult> => {
  // Generate nonce and deadline
  const nonce = generateNonce();
  const deadline = calculateDeadline();

  // Create permit structure
  const permit = createPermitStructure(willData, willContractAddress, nonce, deadline);

  // Sign permit
  return await signPermit2(permit, signer);
};
