/**
 * Permit2 signature generation utilities
 * Uses Uniswap Permit2 SDK to create EIP-712 signatures
 */

import { ethers } from 'ethers';
// import { PERMIT2_ADDRESS } from '@uniswap/permit2-sdk';
// import { CONTRACT_ADDRESSES } from '@/config/contracts';
import type { WillData } from '@pages/testator/TestatorPage';
import { createPermitStructure } from "@shared/utils/blockchain.js";
import { signPermit2 } from '@shared/utils/cryptography/signature.js';
import { generateNonce } from '@shared/utils/cryptography/nonce.js';
import { calculateDeadline } from '@shared/utils/cryptography/deadline.js';
import { Permit2Signature } from "@shared/types/index.js";

// /**
//  * Create permit structure from will data
//  */
// const createPermitStructure = (
//   willData: WillData,
//   willContractAddress: string,
//   nonce: bigint,
//   deadline: number
// ): Permit2Data => {
//   const permitted: PermittedToken[] = willData.estates.map((estate) => ({
//     token: estate.token,
//     amount: BigInt(estate.amount),
//   }));

//   return {
//     permitted,
//     spender: willContractAddress,
//     nonce,
//     deadline,
//   };
// };

/**
 * Sign permit using EIP-712
 * Returns signature that can be used with Permit2 SignatureTransfer
 * Now uses the shared signPermit2 function for consistency between frontend and backend
 */
// export const signPermit2 = async (
//   permit: Permit2Data,
//   signer: ethers.JsonRpcSigner,
//   chainId?: number
// ): Promise<SignatureResult> => {
//   try {
//     // Get chain ID from parameter or provider
//     let resolvedChainId: number;
//     if (chainId !== undefined) {
//       resolvedChainId = chainId;
//     } else {
//       const provider = signer.provider;
//       const network = await provider.getNetwork();
//       resolvedChainId = Number(network.chainId);
//     }

//     // Use Permit2 address from config, fallback to SDK default
//     const permit2Address = CONTRACT_ADDRESSES.PERMIT2 || PERMIT2_ADDRESS;

//     console.log('🔐 Frontend signing with:');
//     console.log('permit:', permit);
//     console.log('permit2Address:', permit2Address);
//     console.log('chainId:', resolvedChainId);

//     // Use the shared signPermit2 function to ensure consistency with backend
//     const signature = await sharedSignPermit2(
//       permit,
//       permit2Address,
//       resolvedChainId,
//       signer
//     );

//     console.log('✅ Frontend signature generated:', signature);

//     return {
//       nonce: permit.nonce,
//       deadline: permit.deadline,
//       signature,
//     };
//   } catch (error) {
//     console.error('Failed to sign permit:', error);
//     throw new Error(
//       `Permit2 signature failed: ${error instanceof Error ? error.message : 'Unknown error'}`
//     );
//   }
// };

/**
 * Generate complete Permit2 signature for will
 * Combines nonce generation, deadline calculation, and signing
 */
const generateWillPermit2Signature = async (
  willData: WillData,
  willContractAddress: string,
  signer: ethers.JsonRpcSigner,
  chainId: number | bigint
): Promise<Permit2Signature> => {
  // Generate nonce and deadline
  // const nonce = generateNonce();
  // const deadline = calculateDeadline();
  const nonce = 94291489168460372312063129039338610341n;
  const deadline = 4915260772;

  const permit = createPermitStructure(willData.estates.map((estate) => ({
    beneficiary: estate.beneficiary,
    token: estate.token,
    amount: BigInt(estate.amount),
  })), willContractAddress, nonce, deadline);

  // Sign permit (pass chainId to avoid network call)
  const signature = await signPermit2(permit, signer, chainId);

  return {
    nonce,
    deadline,
    signature,
  }
};

export { createPermitStructure, generateWillPermit2Signature }