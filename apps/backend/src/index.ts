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
  serializeWill
} from '@shared/utils/index.js';
import { CRYPTO_CONFIG, NETWORK_CONFIG } from '@config';
import type { Groth16Proof, SignedWill } from '@shared/types/index.js';
import { WillFactory__factory } from '@shared/types/typechain-types/index.js';
import { createContract } from '@shared/utils/blockchain.js';
import { JsonRpcProvider, verifyTypedData, TypedDataEncoder } from 'ethers';
import { validateNetwork } from '@shared/utils/validation/index.js';
import { executePredictWill } from './onchain/willFactory/predictWill.js';

// Permit2 canonical address (same across all chains)
const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

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

    // Convert string types to bigint for validation and serialization
    const signedWillWithBigInt: SignedWill = {
      ...signedWill,
      estates: signedWill.estates.map((estate) => ({
        ...estate,
        amount: typeof estate.amount === 'string' ? BigInt(estate.amount) : estate.amount,
      })),
      salt: typeof signedWill.salt === 'string' ? BigInt(signedWill.salt) : signedWill.salt,
      permit2: {
        ...signedWill.permit2,
        nonce: typeof signedWill.permit2.nonce === 'string'
          ? BigInt(signedWill.permit2.nonce)
          : signedWill.permit2.nonce,
      },
    };

    // Verify Permit2 signature before serialization
    console.log("🔍 Verifying Permit2 signature...");
    try {
      // Dynamic import of permit2-sdk to avoid ESM issues
      const { SignatureTransfer } = await import('@uniswap/permit2-sdk');

      // Build permit data for verification
      const permit2Data = {
        permitted: signedWillWithBigInt.estates.map((estate) => ({
          token: estate.token,
          amount: estate.amount,
        })),
        spender: signedWillWithBigInt.will,
        nonce: signedWillWithBigInt.permit2.nonce,
        deadline: signedWillWithBigInt.permit2.deadline,
      };

      console.log("permit2Data:", JSON.stringify(permit2Data, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2));

      // Get chain ID from network config
      const provider = new JsonRpcProvider(NETWORK_CONFIG.rpc.current);
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      console.log("chainId:", chainId);

      // Get EIP-712 typed data
      const permit2Address = process.env.PERMIT2 || PERMIT2_ADDRESS;
      const { domain, types, values } = SignatureTransfer.getPermitData(
        permit2Data,
        permit2Address,
        chainId
      );

      console.log("domain:", domain);
      console.log("types:", JSON.stringify(types, null, 2));
      console.log("values:", JSON.stringify(values, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2));
      console.log("testator from signedWill:", signedWillWithBigInt.testator);
      console.log("signature:", signedWillWithBigInt.permit2.signature);

      // Remove EIP712Domain from types (ethers adds it automatically)
      const { EIP712Domain, ...typesWithoutDomain } = types;

      console.log("typesWithoutDomain:", JSON.stringify(typesWithoutDomain, null, 2));

      // Determine primary type (same logic as frontend)
      const availableTypes = Object.keys(typesWithoutDomain);
      let primaryType: string;
      if (availableTypes.includes('PermitBatchTransferFrom')) {
        primaryType = 'PermitBatchTransferFrom';
      } else if (availableTypes.includes('PermitSingle')) {
        primaryType = 'PermitSingle';
      } else if (availableTypes.includes('PermitTransferFrom')) {
        primaryType = 'PermitTransferFrom';
      } else {
        primaryType = availableTypes.find(t => !['TokenPermissions'].includes(t)) || availableTypes[0];
      }

      console.log("primaryType:", primaryType);

      // Build domain in the same format as frontend (only essential fields)
      const verifyDomain = {
        name: domain.name,
        chainId: Number(domain.chainId),
        verifyingContract: domain.verifyingContract,
      };

      console.log("verifyDomain:", verifyDomain);

      // Create TypedDataEncoder with explicit primaryType
      const encoder = TypedDataEncoder.from(typesWithoutDomain);

      // Get the hash using domain + encoded value
      const hash = encoder.hashStruct(primaryType, values);
      const domainHash = TypedDataEncoder.hashDomain(verifyDomain);

      // Combine domain separator and struct hash for EIP-712
      const { keccak256, concat } = await import('ethers');
      const digest = keccak256(concat(['0x1901', domainHash, hash]));

      console.log("EIP-712 digest:", digest);

      // Recover address from signature
      const { recoverAddress } = await import('ethers');
      const recoveredAddress = recoverAddress(digest, signedWillWithBigInt.permit2.signature);

      console.log("Recovered address:", recoveredAddress);

      // Check if recovered address matches testator
      if (recoveredAddress.toLowerCase() !== signedWillWithBigInt.testator.toLowerCase()) {
        throw new Error(
          `Signature verification failed: recovered address ${recoveredAddress} does not match testator ${signedWillWithBigInt.testator}`
        );
      }

      console.log("✅ Permit2 signature verified successfully");
      console.log("   Signer:", recoveredAddress);
    } catch (verifyError) {
      console.error("❌ Signature verification failed:", verifyError);
      throw new Error(
        `Permit2 signature verification failed: ${verifyError instanceof Error ? verifyError.message : 'Unknown error'}`
      );
    }

    // Serialize will to hex
    let serializedWill = serializeWill(signedWillWithBigInt);

    const plaintext = Buffer.from(serializedWill.hex, 'hex');
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

app.post('/api/utils/predict-will', async (req: Request, res: Response) => {
  try {
    const { testator, executor, estates, salt } = req.body;

    if (!testator || !executor || !estates || !salt) {
      res.status(400).json({ error: 'Missing required fields: testator, executor, estates, salt' });
      return;
    }

    console.log('\n🔮 Predicting Will address...');
    console.log('Request body:', { testator, executor, estates, salt });

    const provider = new JsonRpcProvider(NETWORK_CONFIG.rpc.current);
    await validateNetwork(provider);

    const willFactoryAddress = process.env.WILL_FACTORY;
    if (!willFactoryAddress) {
      throw new Error('WILL_FACTORY address not configured');
    }

    const contract = await createContract(
      willFactoryAddress,
      WillFactory__factory,
      provider,
    );

    const estatesWithBigInt = estates.map((estate: any) => ({
      beneficiary: estate.beneficiary,
      token: estate.token,
      amount: typeof estate.amount === 'string' ? BigInt(estate.amount) : estate.amount,
    }));

    const predictedAddress = await executePredictWill(contract, {
      testator,
      executor,
      estates: estatesWithBigInt,
      salt: typeof salt === 'string' ? BigInt(salt) : salt,
    });

    console.log('✅ Predicted address:', predictedAddress);
    res.json({ willAddress: predictedAddress });
  } catch (error) {
    console.error('❌ Predict will failed:', error);
    res.status(500).json({
      error: 'Predict will failed',
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
