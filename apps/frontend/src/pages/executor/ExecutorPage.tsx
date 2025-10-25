import React, { useState } from 'react';
import { useWallet } from '@hooks/useWallet';
import { downloadFromIPFS } from '@utils/ipfs/helia';
import { decryptWill } from '@utils/cryptography/crypto';
import { generateProof } from '@utils/zkp/snarkjs';
import './ExecutorPage.css';

interface DecryptedWill {
  testator: string;
  executor: string;
  beneficiaries: Array<{
    address: string;
    token: string;
    amount: string;
  }>;
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
      // Convert hex key to Uint8Array
      const keyBytes = new Uint8Array(
        keyInput.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
      );

      const decryptedHex = await decryptWill(encryptedWill, keyBytes);

      // Convert hex back to string
      const decryptedBytes = new Uint8Array(
        decryptedHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
      );
      const decryptedStr = new TextDecoder().decode(decryptedBytes);
      const willData = JSON.parse(decryptedStr);

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
      const keyBytes = Array.from(
        new Uint8Array(keyInput.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)))
      );

      const zkpInput = {
        ciphertext: encryptedWill.ciphertext,
        key: keyBytes,
        iv: encryptedWill.iv,
      };

      const generatedProof = await generateProof('willCreation', zkpInput, (s, p) => {
        setStatus(s);
        setProgress(p);
      });

      setProof(generatedProof);
      setCurrentStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Proof generation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!proof || !decryptedWill) return;

    setIsLoading(true);
    setError(null);

    try {
      // TODO: Implement contract interactions
      console.log('Creating Will contract...');
      console.log('Will data:', decryptedWill);
      console.log('Proof:', proof);

      // Simulate contract creation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log('Executing transfers...');

      // Simulate transfer execution
      await new Promise((resolve) => setTimeout(resolve, 2000));

      alert('Will executed successfully! Assets transferred to beneficiaries.');

      // Reset
      setCurrentStep(1);
      setCid('');
      setKeyInput('');
      setEncryptedWill(null);
      setDecryptedWill(null);
      setProof(null);
    } catch (err) {
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
              <h3>Decrypted Will:</h3>
              <pre>{JSON.stringify(decryptedWill, null, 2)}</pre>
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

            <button onClick={handleExecute} disabled={isLoading} className="btn-execute">
              {isLoading ? 'Executing...' : 'Execute Will & Transfer Assets'}
            </button>
          </div>
        )}

        {error && <div className="error">{error}</div>}
      </div>
    </div>
  );
};

export default ExecutorPage;
