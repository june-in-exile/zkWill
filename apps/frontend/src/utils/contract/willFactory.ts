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
 * Upload CID with ZKP proof and witness addresses
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
  },
  witnesses: [string, string]
) => {
  const contract = getWillFactoryContract(signer);

  const tx = await contract.uploadCid(
    proof.pi_a,
    proof.pi_b,
    proof.pi_c,
    proof.publicSignals,
    will,
    cid,
    witnesses
  );

  const receipt = await tx.wait();
  return receipt;
};

/**
 * Notarize a CID with witness signatures
 */
export const notarizeCid = async (
  signer: JsonRpcSigner,
  cid: string,
  witnessSignatures: [string, string]
) => {
  const contract = getWillFactoryContract(signer);

  const tx = await contract.notarizeCid(cid, witnessSignatures);
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

  const tx = await contract.createWill(
    proof.pi_a,
    proof.pi_b,
    proof.pi_c,
    proof.publicSignals,
    encryptedWillTypedJson,
    cid
  );

  const receipt = await tx.wait();
  return receipt;
};
