import React, { useState } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@hooks/useWallet';
import { downloadFromIPFS } from '@utils/ipfs/helia';
import { decryptWill as decryptWillAPI, generateWillCreationProof } from '@utils/api/client';
import { createWill } from '@utils/contract/willFactory';
import { signatureTransferToBeneficiaries } from '@utils/contract/will';
import './ExecutorPage.css';

interface Estate {
  beneficiary: string;
  token: string;
  amount: string;
}

interface SignedWill {
  testator: string;
  executor: string;
  estates: Estate[];
  salt: string;
  will: string;
  permit2: {
    nonce: string;
    deadline: number;
    signature: string;
  };
}

interface DecryptedWill extends SignedWill {
  // SignedWill already contains all needed fields
}

// Helper to deserialize hex to SignedWill
function deserializeWill(hex: string): SignedWill {
  // This is a simplified version - backend should handle this
  // For now, we'll parse the hex string
  // In production, backend API should return the deserialized object directly

  let offset = 0;
  const FIELD_HEX_LENGTH = {
    ADDRESS: 40,
    AMOUNT: 64,
    SALT: 64,
    NONCE: 32,
    DEADLINE: 16,
    SIGNATURE: 130,
  };

  const testator = '0x' + hex.slice(offset, offset + FIELD_HEX_LENGTH.ADDRESS);
  offset += FIELD_HEX_LENGTH.ADDRESS;

  const executor = '0x' + hex.slice(offset, offset + FIELD_HEX_LENGTH.ADDRESS);
  offset += FIELD_HEX_LENGTH.ADDRESS;

  // Parse estates (assuming 2 for now - should be dynamic)
  const estates: Estate[] = [];
  const numEstates = 2; // TODO: Get from contract or metadata

  for (let i = 0; i < numEstates; i++) {
    const beneficiary = '0x' + hex.slice(offset, offset + FIELD_HEX_LENGTH.ADDRESS);
    offset += FIELD_HEX_LENGTH.ADDRESS;

    const token = '0x' + hex.slice(offset, offset + FIELD_HEX_LENGTH.ADDRESS);
    offset += FIELD_HEX_LENGTH.ADDRESS;

    const amount = BigInt('0x' + hex.slice(offset, offset + FIELD_HEX_LENGTH.AMOUNT)).toString();
    offset += FIELD_HEX_LENGTH.AMOUNT;

    estates.push({ beneficiary, token, amount });
  }

  const salt = BigInt('0x' + hex.slice(offset, offset + FIELD_HEX_LENGTH.SALT)).toString();
  offset += FIELD_HEX_LENGTH.SALT;

  const will = '0x' + hex.slice(offset, offset + FIELD_HEX_LENGTH.ADDRESS);
  offset += FIELD_HEX_LENGTH.ADDRESS;

  const nonce = BigInt('0x' + hex.slice(offset, offset + FIELD_HEX_LENGTH.NONCE)).toString();
  offset += FIELD_HEX_LENGTH.NONCE;

  const deadline = parseInt(hex.slice(offset, offset + FIELD_HEX_LENGTH.DEADLINE), 16);
  offset += FIELD_HEX_LENGTH.DEADLINE;

  const signature = '0x' + hex.slice(offset, offset + FIELD_HEX_LENGTH.SIGNATURE);

  return {
    testator,
    executor,
    estates,
    salt,
    will,
    permit2: {
      nonce,
      deadline,
      signature,
    },
  };
}

const ExecutorPage: React.FC = () => {
  const { isConnected, signer } = useWallet();
  const [currentStep, setCurrentStep] = useState(1);
  const [cid, setCid] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [encryptedWill, setEncryptedWill] = useState<any>(null);
  const [decryptedWill, setDecryptedWill] = useState<DecryptedWill | null>(null);
  const [proof, setProof] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cid.trim()) {
      setError('Please enter a CID');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const downloaded = await downloadFromIPFS(cid);
      setEncryptedWill(downloaded);
      setCurrentStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecrypt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) {
      setError('Please enter the decryption key');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Convert hex key to number array for backend API
      const keyBytes = keyInput.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16));

      // Decrypt via backend API
      const decryptedResult = await decryptWillAPI(
        encryptedWill.ciphertext,
        keyBytes,
        encryptedWill.iv,
        encryptedWill.algorithm
      );

      // Deserialize the hex string back to SignedWill structure
      const willData = deserializeWill(decryptedResult.hex);

      console.log('Decrypted and deserialized will:', willData);

      setDecryptedWill(willData);
      setCurrentStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Decryption failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateProof = async () => {
    if (!encryptedWill || !keyInput) return;

    setIsLoading(true);
    setError(null);

    try {
      setStatus('Sending data to backend for ZKP generation...');
      setProgress(10);

      const keyBytes = keyInput.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16));

      const generatedProof = await generateWillCreationProof(
        encryptedWill.ciphertext,
        keyBytes,
        encryptedWill.iv
      );

      setStatus('ZKP proof generated successfully!');
      setProgress(100);
      setProof(generatedProof);
      setCurrentStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Proof generation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!proof || !decryptedWill || !signer) return;

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Create Will contract
      setStatus('Creating Will contract...');
      console.log('Creating Will contract...');
      console.log('Will data:', decryptedWill);
      console.log('Proof:', proof);

      // Prepare will data for contract call
      const willData = {
        testator: decryptedWill.testator,
        executor: decryptedWill.executor,
        beneficiaries: decryptedWill.estates.map((e) => e.beneficiary),
        tokens: decryptedWill.estates.map((e) => e.token),
        amounts: decryptedWill.estates.map((e) => BigInt(e.amount)),
        nonce: BigInt(decryptedWill.permit2.nonce),
        deadline: BigInt(decryptedWill.permit2.deadline),
        signature: decryptedWill.permit2.signature,
      };

      // Format salt as bytes32 hex string
      const saltBytes32 = ethers.toBeHex(BigInt(decryptedWill.salt), 32);

      const createReceipt = await createWill(
        signer,
        cid,
        proof,
        willData,
        saltBytes32
      );

      console.log('Will contract created!', createReceipt);
      const willAddress = decryptedWill.will; // This is the predicted Will address

      // Step 2: Execute signature transfer to beneficiaries
      setStatus('Executing transfers to beneficiaries...');
      console.log('Executing transfers...');

      const transferReceipt = await signatureTransferToBeneficiaries(
        willAddress,
        signer,
        decryptedWill.permit2.nonce,
        decryptedWill.permit2.deadline,
        decryptedWill.permit2.signature
      );

      console.log('Transfers completed!', transferReceipt);

      alert('Will executed successfully! Assets transferred to beneficiaries.');

      // Reset
      setCurrentStep(1);
      setCid('');
      setKeyInput('');
      setEncryptedWill(null);
      setDecryptedWill(null);
      setProof(null);
      setStatus('');
    } catch (err) {
      console.error('Execution failed:', err);
      setError(err instanceof Error ? err.message : 'Execution failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="executor-page">
        <div className="connect-prompt">
          <h2>Connect Wallet</h2>
          <p>Please connect your wallet to execute wills</p>
        </div>
      </div>
    );
  }

  return (
    <div className="executor-page">
      <div className="page-header">
        <h1>Executor Dashboard</h1>
        <p>Download, decrypt, and execute probated wills</p>
      </div>

      <div className="steps-indicator">
        <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>1. Download</div>
        <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>2. Decrypt</div>
        <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>3. Generate Proof</div>
        <div className={`step ${currentStep >= 4 ? 'active' : ''}`}>4. Execute</div>
      </div>

      <div className="card">
        {currentStep === 1 && (
          <div>
            <h2>Download Will from IPFS</h2>
            <form onSubmit={handleDownload} className="download-form">
              <div className="form-group">
                <label>Enter CID</label>
                <input
                  type="text"
                  value={cid}
                  onChange={(e) => setCid(e.target.value)}
                  placeholder="bafybeigdyrzt..."
                  disabled={isLoading}
                />
              </div>
              <button type="submit" disabled={isLoading}>
                {isLoading ? 'Downloading...' : 'Download Will'}
              </button>
            </form>
          </div>
        )}

        {currentStep === 2 && (
          <div>
            <h2>Decrypt Will</h2>
            <form onSubmit={handleDecrypt} className="decrypt-form">
              <div className="form-group">
                <label>Enter Decryption Key (hex)</label>
                <input
                  type="text"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="a1b2c3d4..."
                  disabled={isLoading}
                />
              </div>
              <button type="submit" disabled={isLoading}>
                {isLoading ? 'Decrypting...' : 'Decrypt Will'}
              </button>
            </form>
          </div>
        )}

        {currentStep === 3 && decryptedWill && (
          <div>
            <h2>Generate ZK Proof</h2>
            <div className="will-preview">
              <h3>Decrypted Will Data:</h3>
              <div className="will-info">
                <div><strong>Testator:</strong> {decryptedWill.testator}</div>
                <div><strong>Executor:</strong> {decryptedWill.executor}</div>
                <div><strong>Will Address:</strong> {decryptedWill.will}</div>
                <div><strong>Salt:</strong> {BigInt(decryptedWill.salt).toString(16).slice(0, 16)}...</div>
                <div><strong>Estates:</strong></div>
                <ul>
                  {decryptedWill.estates.map((estate, idx) => (
                    <li key={idx}>
                      <div>Beneficiary: {estate.beneficiary}</div>
                      <div>Token: {estate.token}</div>
                      <div>Amount: {estate.amount}</div>
                    </li>
                  ))}
                </ul>
                <div><strong>Permit2 Data:</strong></div>
                <div>- Nonce: {BigInt(decryptedWill.permit2.nonce).toString(16).slice(0, 16)}...</div>
                <div>- Deadline: {new Date(decryptedWill.permit2.deadline * 1000).toLocaleString()}</div>
                <div>- Signature: {decryptedWill.permit2.signature.slice(0, 20)}...</div>
              </div>
            </div>

            {isLoading && (
              <div className="progress-info">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <p>{status}</p>
              </div>
            )}

            <button onClick={handleGenerateProof} disabled={isLoading}>
              {isLoading ? 'Generating Proof...' : 'Generate Proof'}
            </button>
          </div>
        )}

        {currentStep === 4 && proof && (
          <div>
            <h2>Execute Will</h2>
            <div className="success">✓ Proof generated successfully!</div>
            <p>Ready to create Will contract and execute transfers.</p>

            {decryptedWill && (
              <div className="execution-summary">
                <h3>Execution Summary:</h3>
                <div>
                  <strong>Step 1:</strong> Create Will contract at address {decryptedWill.will}
                </div>
                <div>
                  <strong>Step 2:</strong> Transfer assets to {decryptedWill.estates.length} beneficiar{decryptedWill.estates.length > 1 ? 'ies' : 'y'}
                </div>
              </div>
            )}

            {status && (
              <div className="status-info">
                <p>{status}</p>
              </div>
            )}

            <button onClick={handleExecute} disabled={isLoading} className="btn-execute">
              {isLoading ? `Executing... (${status})` : 'Execute Will & Transfer Assets'}
            </button>
          </div>
        )}

        {error && <div className="error">{error}</div>}
      </div>
    </div>
  );
};

export default ExecutorPage;
