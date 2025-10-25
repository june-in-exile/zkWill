/**
 * Will contract interaction utilities
 */

import { Contract } from 'ethers';
import type { JsonRpcSigner } from 'ethers';
import WillABI from '@/config/abi/Will.json';

/**
 * Get Will contract instance
 */
export const getWillContract = (willAddress: string, signer: JsonRpcSigner) => {
  return new Contract(willAddress, WillABI, signer);
};

/**
 * Execute signature transfer to beneficiaries
 */
export const signatureTransferToBeneficiaries = async (
  willAddress: string,
  signer: JsonRpcSigner
) => {
  const contract = getWillContract(willAddress, signer);

  const tx = await contract.signatureTransferToBeneficiaries();
  const receipt = await tx.wait();
  return receipt;
};

/**
 * Get will details
 */
export const getWillDetails = async (
  willAddress: string,
  signer: JsonRpcSigner
) => {
  const contract = getWillContract(willAddress, signer);

  const testator = await contract.testator();
  const executor = await contract.executor();
  const cid = await contract.cid();

  return {
    testator,
    executor,
    cid,
  };
};
