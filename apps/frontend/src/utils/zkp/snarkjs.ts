/**
 * ZKP utilities for formatting proofs
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
