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
    proof: {
      pi_a: [string, string];
      pi_b: [[string, string], [string, string]];
      pi_c: [string, string];
      protocol: string;
      curve: string;
    };
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

  const tx = await contract.uploadCid(
    proof.proof.pi_a,
    proof.proof.pi_b,
    proof.proof.pi_c,
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
    proof: {
      pi_a: [string, string];
      pi_b: [[string, string], [string, string]];
      pi_c: [string, string];
      protocol: string;
      curve: string;
    };
    publicSignals: string[];
  },
  encryptedWillTypedJson: {
    keys: string[];
    values: Array<{
      value: string;
      numberArray: string[];
      valueType: number;
    }>;
  }
) => {
  const contract = getWillFactoryContract(signer);

  console.log('=== createWill Contract Call Parameters ===');
  console.log('pi_a:', proof.proof.pi_a);
  console.log('pi_b:', proof.proof.pi_b);
  console.log('pi_c:', proof.proof.pi_c);
  console.log('publicSignals length:', proof.publicSignals.length);
  console.log('encryptedWillTypedJson keys:', encryptedWillTypedJson.keys);
  console.log('encryptedWillTypedJson values length:', encryptedWillTypedJson.values.length);
  encryptedWillTypedJson.values.forEach((v, idx) => {
    console.log(`Value ${idx} (${encryptedWillTypedJson.keys[idx]}):`, {
      valueType: v.valueType,
      value: v.value ? v.value.slice(0, 50) : '(empty)',
      numberArrayLength: v.numberArray.length,
      numberArraySample: v.numberArray.slice(0, 3)
    });
  });
  console.log('cid:', cid);
  console.log('==========================================');

  const tx = await contract.createWill(
    proof.proof.pi_a,
    proof.proof.pi_b,
    proof.proof.pi_c,
    proof.publicSignals,
    encryptedWillTypedJson,
    cid
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
