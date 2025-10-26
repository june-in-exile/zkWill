/**
 * ZKP utilities - calls backend API for proof generation
 *
 * Note: In production, proof generation should be handled by trusted external nodes
 * such as TEE (Trusted Execution Environment) to ensure security and performance.
 * This implementation delegates to a backend server for demonstration purposes.
 */

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

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

/**
 * Generate ZKP proof by calling the backend API
 * This avoids loading multi-GB circuit files in the browser
 */
export const generateProof = async (
  circuitName: CircuitName,
  input: ZKPInput,
  onProgress?: (status: string, progress: number) => void
): Promise<Groth16Proof> => {
  try {
    onProgress?.('Sending request to backend...', 10);

    const response = await fetch(`${BACKEND_URL}/api/zkp/${circuitName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    onProgress?.('Waiting for proof generation...', 50);

    const proof: Groth16Proof = await response.json();

    onProgress?.('Proof generated!', 100);

    return proof;
  } catch (error) {
    console.error('Failed to generate proof:', error);
    throw new Error(`ZKP generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
