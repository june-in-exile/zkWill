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
  console.log('📤 DEBUG - Sending to backend /api/crypto/encrypt');
  console.log('📤 DEBUG - Request body:', JSON.stringify({ signedWill }, null, 2));

  const response = await fetch(`${API_BASE_URL}/api/crypto/encrypt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ signedWill }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('❌ DEBUG - Backend encryption failed:', error);
    throw new Error(error.message || 'Encryption failed');
  }

  const result = await response.json();
  console.log('📥 DEBUG - Backend response received');

  return result;
}

/**
 * Decrypt will data using backend
 */
export async function decryptWill(
  ciphertext: number[],
  key: number[],
  iv: number[],
  algorithm?: string
): Promise<{ plaintext: number[]; hex: string }> {
  console.log('🔓 DEBUG - Sending to backend /api/crypto/decrypt');
  console.log('🔓 DEBUG - Request params:', {
    ciphertextLength: ciphertext.length,
    keyLength: key.length,
    ivLength: iv.length,
    algorithm: algorithm || 'default'
  });

  const response = await fetch(`${API_BASE_URL}/api/crypto/decrypt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ciphertext, key, iv, algorithm }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('❌ DEBUG - Backend decryption failed:', error);
    throw new Error(error.message || 'Decryption failed');
  }

  const result = await response.json();
  console.log('📥 DEBUG - Decryption response received');
  console.log('📥 DEBUG - Plaintext length:', result.plaintext?.length, 'bytes');

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

// Export for backwards compatibility
export { generateWillCreationProof as generateWillCreation };

/**
 * Generate a random salt
 */
export async function generateSalt(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/utils/generate-salt`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Salt generation failed');
  }

  const data = await response.json();
  return data.salt;
}

/**
 * Predict Will contract address using CREATE2
 */
export async function predictWillAddress(
  testator: string,
  executor: string,
  estates: Array<{
    beneficiary: string;
    token: string;
    amount: string;
  }>,
  salt: string
): Promise<string> {
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
  return data.willAddress;
}

/**
 * Sign Permit2 using backend's TESTATOR_PRIVATE_KEY
 */
export async function signPermit2WithBackend(
  estates: Array<{
    token: string;
    amount: string;
  }>,
  willAddress: string,
  nonce: string,
  deadline: number
): Promise<{ signature: string; signerAddress: string }> {
  const response = await fetch(`${API_BASE_URL}/api/permit2/sign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ estates, willAddress, nonce, deadline }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Permit2 signing failed');
  }

  return response.json();
}
