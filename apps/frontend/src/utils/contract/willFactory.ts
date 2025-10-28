/**
 * WillFactory contract interaction utilities
 */

import { Contract } from 'ethers';
import type { JsonRpcSigner } from 'ethers';
import { getContractAddress } from '@/config/contracts';
import WillFactoryABI from '@/config/abi/WillFactory.json';

/**
 * Get WillFactory contract instance
 */
export const getWillFactoryContract = (signer: JsonRpcSigner) => {
  const address = getContractAddress('WILL_FACTORY');
  return new Contract(address, WillFactoryABI, signer);
};

/**
 * Upload CID with ZKP proof
 */
export const uploadCid = async (
  signer: JsonRpcSigner,
  cid: string,
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    publicSignals: string[];
  },
  will: {
    keys: string[];
    values: Array<{
      value: string;
      numberArray: string[];
      valueType: number;
    }>;
  }
) => {
  const contract = getWillFactoryContract(signer);

  console.log("DEBUG - proof:", proof);
  console.log("DEBUG - will:", will);
  console.log("DEBUG - cid:", cid);

  const tx = await contract.uploadCid(
    proof.pi_a,
    proof.pi_b,
    proof.pi_c,
    proof.publicSignals,
    will,
    cid
  );

  const receipt = await tx.wait();
  return receipt;
};

/**
 * Notarize a CID
 */
export const notarizeCid = async (
  signer: JsonRpcSigner,
  cid: string
) => {
  const contract = getWillFactoryContract(signer);

  const tx = await contract.notarizeCid(cid);
  const receipt = await tx.wait();
  return receipt;
};

/**
 * Probate a CID (Oracle authorization)
 */
export const probateCid = async (
  signer: JsonRpcSigner,
  cid: string
) => {
  const contract = getWillFactoryContract(signer);

  const tx = await contract.probateCid(cid);
  const receipt = await tx.wait();
  return receipt;
};

/**
 * Create Will contract
 */
export const createWill = async (
  signer: JsonRpcSigner,
  cid: string,
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    publicSignals: string[];
  },
  willData: {
    testator: string;
    executor: string;
    beneficiaries: string[];
    tokens: string[];
    amounts: bigint[];
    nonce: bigint;
    deadline: bigint;
    signature: string;
  },
  salt: string
) => {
  const contract = getWillFactoryContract(signer);

  const tx = await contract.createWill(
    cid,
    proof.pi_a,
    proof.pi_b,
    proof.pi_c,
    proof.publicSignals,
    willData,
    salt
  );

  const receipt = await tx.wait();
  return receipt;
};

/**
 * Get CID details
 */
export const getCidDetails = async (
  signer: JsonRpcSigner,
  cid: string
) => {
  const contract = getWillFactoryContract(signer);
  return await contract.cidDetails(cid);
};

/**
 * Check if CID is notarized
 */
export const isCidNotarized = async (
  signer: JsonRpcSigner,
  cid: string
): Promise<boolean> => {
  const details = await getCidDetails(signer, cid);
  return details.isNotarized;
};

/**
 * Check if CID is probated
 */
export const isCidProbated = async (
  signer: JsonRpcSigner,
  cid: string
): Promise<boolean> => {
  const details = await getCidDetails(signer, cid);
  return details.isProbated;
};
