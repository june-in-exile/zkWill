import { ethers } from 'ethers';
import type { WillData } from '@pages/testator/TestatorPage';
import { createPermitStructure } from "@shared/utils/blockchain.js";
import { signPermit2 } from '@shared/utils/cryptography/signature.js';
import { generateNonce } from '@shared/utils/cryptography/nonce.js';
import { calculateDeadline } from '@shared/utils/cryptography/deadline.js';
import { Permit2Signature } from "@shared/types/index.js";

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
  const nonce = generateNonce();
  const deadline = calculateDeadline();

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