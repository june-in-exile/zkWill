/**
 * Will contract interaction utilities
 */

import { Contract } from 'ethers';
import type { JsonRpcSigner } from 'ethers';
import WillABI from '@/config/abi/Will.json';

/**
 * Get Will contract instance (internal use only)
 */
const getWillContract = (willAddress: string, signer: JsonRpcSigner) => {
  return new Contract(willAddress, WillABI, signer);
};

/**
 * Execute signature transfer to beneficiaries
 * @param willAddress - Address of the Will contract
 * @param signer - Ethers signer (must be the executor)
 * @param nonce - Permit2 nonce from the signed will
 * @param deadline - Permit2 deadline from the signed will
 * @param signature - Permit2 signature from the signed will
 */
export const signatureTransferToBeneficiaries = async (
  willAddress: string,
  signer: JsonRpcSigner,
  nonce: bigint | string,
  deadline: number | bigint,
  signature: string
) => {
  const contract = getWillContract(willAddress, signer);

  const tx = await contract.signatureTransferToBeneficiaries(
    BigInt(nonce),
    BigInt(deadline),
    signature
  );
  const receipt = await tx.wait();
  return receipt;
};
