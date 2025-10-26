import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import { generateZkpProof } from '@shared/utils/cryptography/zkp.js';
import {
  generateKey,
  generateInitializationVector,
  generateSalt,
  encrypt,
  decrypt,
  serializeWillToHex
} from '@shared/utils/index.js';
import { CRYPTO_CONFIG } from '@config';
import type { Groth16Proof, SignedWill } from '@shared/types/index.js';

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Large limit for encrypted will data

interface ZkpRequest {
  ciphertext: number[];
  key: number[];
  iv: number[];
}

// ZKP Routes
app.post('/api/zkp/cidUpload', async (req: Request, res: Response) => {
  try {
    const { ciphertext, key, iv } = req.body as ZkpRequest;

    if (!ciphertext || !key || !iv) {
      res.status(400).json({ error: 'Missing required fields: ciphertext, key, iv' });
      return;
    }

    if (!Array.isArray(ciphertext) || !Array.isArray(key) || !Array.isArray(iv)) {
      res.status(400).json({ error: 'Invalid input: ciphertext, key, and iv must be arrays' });
      return;
    }

    console.log(`\n🔐 Generating ZKP proof for cidUpload...`);
    const proof: Groth16Proof = await generateZkpProof({
      circuitName: 'cidUpload',
      input: { ciphertext, key, iv },
    });

    console.log(`✅ Proof generated successfully\n`);
    res.json(proof);
  } catch (error) {
    console.error('❌ Proof generation failed:', error);
    res.status(500).json({
      error: 'Proof generation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.post('/api/zkp/willCreation', async (req: Request, res: Response) => {
  try {
    const { ciphertext, key, iv } = req.body as ZkpRequest;

    if (!ciphertext || !key || !iv) {
      res.status(400).json({ error: 'Missing required fields: ciphertext, key, iv' });
      return;
    }

    if (!Array.isArray(ciphertext) || !Array.isArray(key) || !Array.isArray(iv)) {
      res.status(400).json({ error: 'Invalid input: ciphertext, key, and iv must be arrays' });
      return;
    }

    console.log(`\n🔐 Generating ZKP proof for willCreation...`);
    const proof: Groth16Proof = await generateZkpProof({
      circuitName: 'willCreation',
      input: { ciphertext, key, iv },
    });

    console.log(`✅ Proof generated successfully\n`);
    res.json(proof);
  } catch (error) {
    console.error('❌ Proof generation failed:', error);
    res.status(500).json({
      error: 'Proof generation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// Cryptography Routes
// ============================================================================

app.post('/api/crypto/encrypt', async (req: Request, res: Response) => {
  try {
    const { signedWill } = req.body as { signedWill: SignedWill };

    if (!signedWill) {
      res.status(400).json({ error: 'Missing required field: signedWill' });
      return;
    }

    console.log(`\n🔐 Encrypting will data...`);

    // Serialize will to hex
    let hexString = serializeWillToHex(signedWill);
    if (hexString.length % 2 === 1) {
      hexString += '0';
    }

    const plaintext = Buffer.from(hexString, 'hex');
    const key = generateKey();
    const iv = generateInitializationVector();

    const result = encrypt(CRYPTO_CONFIG.algorithm, plaintext, key, iv);

    const encryptedWill = {
      algorithm: CRYPTO_CONFIG.algorithm,
      iv: Array.from(iv),
      authTag: "authTag" in result ? Array.from(result.authTag) : Array.from(Buffer.alloc(0)),
      ciphertext: Array.from(result.ciphertext),
      timestamp: Math.floor(Date.now() / 1000),
      key: Array.from(key) // Return key to frontend
    };

    console.log(`✅ Will encrypted successfully\n`);
    res.json(encryptedWill);
  } catch (error) {
    console.error('❌ Encryption failed:', error);
    res.status(500).json({
      error: 'Encryption failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.post('/api/crypto/decrypt', async (req: Request, res: Response) => {
  try {
    const { ciphertext, key, iv, algorithm } = req.body;

    if (!ciphertext || !key || !iv) {
      res.status(400).json({ error: 'Missing required fields: ciphertext, key, iv' });
      return;
    }

    console.log(`\n🔓 Decrypting will data...`);

    const ciphertextBuffer = Buffer.from(ciphertext);
    const keyBuffer = Buffer.from(key);
    const ivBuffer = Buffer.from(iv);

    const plaintext = decrypt(
      algorithm || CRYPTO_CONFIG.algorithm,
      ciphertextBuffer,
      keyBuffer,
      ivBuffer
    );

    console.log(`✅ Will decrypted successfully\n`);
    res.json({
      plaintext: Array.from(plaintext),
      hex: plaintext.toString('hex')
    });
  } catch (error) {
    console.error('❌ Decryption failed:', error);
    res.status(500).json({
      error: 'Decryption failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// Utility Routes
// ============================================================================

app.get('/api/utils/generate-salt', (_req: Request, res: Response) => {
  try {
    const salt = generateSalt();
    res.json({ salt: salt.toString() });
  } catch (error) {
    res.status(500).json({
      error: 'Salt generation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`🔐 Crypto endpoints: http://localhost:${PORT}/api/crypto/*`);
  console.log(`🔐 ZKP endpoints: http://localhost:${PORT}/api/zkp/*`);
  console.log(`🛠️  Utility endpoints: http://localhost:${PORT}/api/utils/*\n`);
});

export default app;
