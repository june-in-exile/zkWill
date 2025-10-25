/**
 * ZKP utilities using snarkjs in browser
 */

import { groth16 } from 'snarkjs';

export interface Groth16Proof {
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
    curve: string;
  };
  publicSignals: string[];
}

export interface ZKPInput {
  ciphertext: number[];
  key: number[];
  iv: number[];
}

export type CircuitName = 'willCreation' | 'cidUpload';

/**
 * Generate ZKP proof
 * This will load the circuit files and generate a proof
 */
export const generateProof = async (
  circuitName: CircuitName,
  input: ZKPInput,
  onProgress?: (status: string, progress: number) => void
): Promise<Groth16Proof> => {
  try {
    onProgress?.('Loading circuit files...', 10);

    // Load WASM and zkey files from public directory
    const wasmPath = `/zkp/${circuitName}/${circuitName}.wasm`;
    const zkeyPath = `/zkp/${circuitName}/${circuitName}_0001.zkey`;

    onProgress?.('Downloading WASM...', 30);
    const wasmResponse = await fetch(wasmPath);
    if (!wasmResponse.ok) {
      throw new Error(`Failed to load WASM file: ${wasmPath}`);
    }
    const wasmBuffer = await wasmResponse.arrayBuffer();

    onProgress?.('Downloading zkey...', 50);
    const zkeyResponse = await fetch(zkeyPath);
    if (!zkeyResponse.ok) {
      throw new Error(`Failed to load zkey file: ${zkeyPath}`);
    }
    const zkeyBuffer = await zkeyResponse.arrayBuffer();

    onProgress?.('Generating proof...', 70);

    // Generate the proof
    const { proof, publicSignals } = await groth16.fullProve(
      input,
      new Uint8Array(wasmBuffer),
      new Uint8Array(zkeyBuffer)
    );

    onProgress?.('Proof generated!', 100);

    return {
      proof: proof as any,
      publicSignals,
    };
  } catch (error) {
    console.error('Failed to generate proof:', error);
    throw new Error(`ZKP generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Verify ZKP proof (optional, for testing)
 */
export const verifyProof = async (
  circuitName: CircuitName,
  proof: Groth16Proof
): Promise<boolean> => {
  try {
    // Load verification key
    const vkeyPath = `/zkp/${circuitName}/verification_key.json`;
    const vkeyResponse = await fetch(vkeyPath);
    if (!vkeyResponse.ok) {
      throw new Error(`Failed to load verification key: ${vkeyPath}`);
    }
    const vkey = await vkeyResponse.json();

    // Verify the proof
    const isValid = await groth16.verify(vkey, proof.publicSignals, proof.proof);
    return isValid;
  } catch (error) {
    console.error('Failed to verify proof:', error);
    return false;
  }
};

/**
 * Format proof for smart contract submission
 */
export const formatProofForContract = (proof: Groth16Proof) => {
  return {
    pi_a: proof.proof.pi_a.slice(0, 2),
    pi_b: [
      [proof.proof.pi_b[0][1], proof.proof.pi_b[0][0]],
      [proof.proof.pi_b[1][1], proof.proof.pi_b[1][0]],
    ],
    pi_c: proof.proof.pi_c.slice(0, 2),
    publicSignals: proof.publicSignals,
  };
};
