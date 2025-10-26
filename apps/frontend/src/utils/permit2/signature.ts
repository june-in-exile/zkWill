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
  const permitted: PermittedToken[] = willData.beneficiaries.map((beneficiary) => ({
    token: beneficiary.token,
    amount: BigInt(beneficiary.amount), // Ensure amount is bigint
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

    console.log('Generating Permit2 signature...');
    console.log('Chain ID:', resolvedChainId);
    console.log('Permit2 Address:', permit2Address);
    console.log('Spender (Will):', permit.spender);
    console.log('Tokens:', permit.permitted.length);
    console.log('Nonce:', permit.nonce.toString());
    console.log('Deadline:', permit.deadline);
    console.log('Deadline (date):', new Date(permit.deadline * 1000).toISOString());

    // Get EIP-712 typed data from Permit2 SDK
    // Pass chainId as number (SDK accepts both number and bigint)
    const { domain, types, values } = SignatureTransfer.getPermitData(
      permit,
      permit2Address,
      resolvedChainId
    );

    console.log('EIP-712 data generated');
    console.log('Domain:', domain);
    console.log('Values:', values);

    // Use window.ethereum directly for better compatibility with MetaMask
    // This approach avoids ethers v5/v6 signer differences
    const signerAddress = await signer.getAddress();

    if (!window.ethereum) {
      throw new Error('MetaMask not available');
    }

    console.log('Requesting signature from wallet (eth_signTypedData_v4)...');

    // Construct EIP-712 message for eth_signTypedData_v4
    // This is the standard MetaMask format
    const typedData = {
      types,
      domain,
      primaryType: 'PermitBatch', // Permit2 SDK uses PermitBatch for multiple tokens
      message: values,
    };

    console.log('TypedData for signing:', JSON.stringify(typedData, (_key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    , 2));

    let signature: string;
    try {
      signature = (await window.ethereum.request({
        method: 'eth_signTypedData_v4',
        params: [
          signerAddress,
          JSON.stringify(typedData, (_key, value) =>
            typeof value === 'bigint' ? value.toString() : value
          ),
        ],
      })) as string;

      console.log('Signature generated successfully!');
    } catch (signError: any) {
      console.error('Signature error:', signError);

      // Check if it's a user rejection
      if (signError.code === 'ACTION_REJECTED' || signError.code === 4001) {
        throw new Error('User rejected the signature request');
      }

      throw new Error(
        `Signature failed: ${signError.message || 'Unknown error'}`
      );
    }

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
