/**
 * Backend API Client
 * Centralized API calls to backend server
 */

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

interface SignedWill {
  testator: string;
  executor: string;
  estates: Array<{
    beneficiary: string;
    token: string;
    amount: string;
  }>;
  salt: string;
  will: string;
  permit2: {
    nonce: string;
    deadline: number;
    signature: string;
  };
}

interface EncryptedWill {
  algorithm: string;
  iv: number[];
  authTag: number[];
  ciphertext: number[];
  timestamp: number;
  key: number[];
}

interface ZkpProof {
  proof: {
    pi_a: [string, string];
    pi_b: [[string, string], [string, string]];
    pi_c: [string, string];
    protocol: string;
    curve: string;
  };
  publicSignals: string[];
}

/**
 * Encrypt will data using backend
 */
export async function encryptWill(signedWill: SignedWill): Promise<EncryptedWill> {
  const response = await fetch(`${API_BASE_URL}/api/crypto/encrypt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ signedWill }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Encryption failed');
  }

  const result = await response.json();

  return result;
}

/**
 * Decrypt will data using backend (also deserializes automatically)
 */
export async function decryptWill(
  ciphertext: number[],
  key: number[],
  iv: number[],
  algorithm?: string
): Promise<SignedWill> {
  const response = await fetch(`${API_BASE_URL}/api/crypto/decrypt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ciphertext, key, iv, algorithm }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Decryption failed');
  }

  const result = await response.json();

  return result;
}

/**
 * Generate ZKP proof for CID upload
 */
export async function generateCidUploadProof(
  ciphertext: number[],
  key: number[],
  iv: number[]
): Promise<ZkpProof> {
  const response = await fetch(`${API_BASE_URL}/api/zkp/cidUpload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ciphertext, key, iv }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Proof generation failed');
  }

  return response.json();
}

/**
 * Generate ZKP proof for will creation (used by executor)
 */
export async function generateWillCreationProof(
  ciphertext: number[],
  key: number[],
  iv: number[]
): Promise<ZkpProof> {
  const response = await fetch(`${API_BASE_URL}/api/zkp/willCreation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ciphertext, key, iv }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Proof generation failed');
  }

  return response.json();
}

/**
 * Predict Will contract address using CREATE2
 * Automatically generates salt if not provided
 */
export async function predictWillAddress(
  testator: string,
  executor: string,
  estates: Array<{
    beneficiary: string;
    token: string;
    amount: string;
  }>,
  salt?: string
): Promise<{ willAddress: string; salt: string }> {
  const response = await fetch(`${API_BASE_URL}/api/utils/predict-will`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ testator, executor, estates, salt }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Predict will address failed');
  }

  const data = await response.json();
  return { willAddress: data.willAddress, salt: data.salt };
}
