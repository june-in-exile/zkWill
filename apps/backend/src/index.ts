import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import { generateZkpProof } from '@shared/utils/cryptography/zkp.js';
import type { Groth16Proof } from '@shared/types/index.js';

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

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`🔐 ZKP endpoints: http://localhost:${PORT}/api/zkp/*\n`);
});

export default app;
