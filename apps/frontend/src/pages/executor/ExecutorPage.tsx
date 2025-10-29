import React, { useState } from 'react';
import { useWallet } from '@hooks/useWallet';
import { downloadFromIPFS } from '@utils/ipfs/helia';
import { decryptWill as decryptWillAPI, generateWillCreationProof } from '@utils/api/client';
import { createWill } from '@utils/contract/willFactory';
import { signatureTransferToBeneficiaries } from '@utils/contract/will';
import { encryptedWillToTypedJsonObject } from '@utils/transform/encryptedWill';
import { formatProofForContract } from '@utils/zkp/snarkjs';
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
  const [transactionRecords, setTransactionRecords] = useState<{
    createWillTx?: string;
    transferTx?: string;
    willAddress?: string;
  } | null>(null);

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cid.trim()) {
      setError('Please enter a CID');
      return;
    }

    console.log('=== [ExecutorPage] Starting download ===');
    console.log('[ExecutorPage] CID:', cid);

    setIsLoading(true);
    setError(null);
    setStatus('Downloading from IPFS... This may take a moment.');

    try {
      console.log('[ExecutorPage] Calling downloadFromIPFS...');
      const downloaded = await downloadFromIPFS(cid);
      console.log('[ExecutorPage] Download successful!');
      console.log('[ExecutorPage] Downloaded data:', downloaded);

      setEncryptedWill(downloaded);
      setStatus('Download complete!');
      setCurrentStep(2);
    } catch (err) {
      console.error('[ExecutorPage] Download failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Download failed';
      setError(errorMessage);

      // Provide helpful guidance based on the error
      if (errorMessage.includes('Failed to download from IPFS after trying all methods')) {
        setError(
          'Failed to download the will from IPFS. Possible reasons:\n' +
          '1. The CID has not been uploaded to IPFS yet\n' +
          '2. The content is not pinned or available on the network\n' +
          '3. The CID format may be invalid\n\n' +
          'Please verify the CID and ensure the content is available.'
        );
      }
    } finally {
      setIsLoading(false);
      setStatus('');
      console.log('[ExecutorPage] Download process complete');
    }
  };

  const handleKeyFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      console.log('[ExecutorPage] Reading key file:', file.name);
      const text = await file.text();

      // Extract hex key from file content (remove whitespace, newlines, etc.)
      const cleanedKey = text.replace(/\s+/g, '').trim();

      // Validate hex format
      if (!/^[0-9a-fA-F]+$/.test(cleanedKey)) {
        setError('Invalid key format. File should contain a hexadecimal key.');
        return;
      }

      console.log('[ExecutorPage] Key loaded from file, length:', cleanedKey.length);
      setKeyInput(cleanedKey);
      setError(null);
    } catch (err) {
      console.error('[ExecutorPage] Failed to read key file:', err);
      setError('Failed to read key file');
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

      console.log('[ExecutorPage] Decrypting and deserializing will...');
      // Decrypt via backend API (also deserializes automatically)
      const willData = await decryptWillAPI(
        encryptedWill.ciphertext,
        keyBytes,
        encryptedWill.iv,
        encryptedWill.algorithm
      );

      console.log('[ExecutorPage] Decryption and deserialization successful:', willData);

      setDecryptedWill(willData);
      setCurrentStep(3);
    } catch (err) {
      console.error('[ExecutorPage] Decryption/deserialization failed:', err);
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

  const handleReset = () => {
    setCurrentStep(1);
    setCid('');
    setKeyInput('');
    setEncryptedWill(null);
    setDecryptedWill(null);
    setProof(null);
    setStatus('');
    setError(null);
    setTransactionRecords(null);
  };

  const handleExecute = async () => {
    if (!proof || !decryptedWill || !signer || !encryptedWill) return;

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Create Will contract
      setStatus('Creating Will contract...');
      console.log('Creating Will contract...');
      console.log('Will data:', decryptedWill);
      console.log('Proof:', proof);

      // Convert encrypted will to TypedJsonObject format for contract
      const willObject = encryptedWillToTypedJsonObject(encryptedWill);

      // Format proof for contract (same as testator flow)
      const formattedProof = formatProofForContract(proof);

      const createReceipt = await createWill(
        signer,
        cid,
        formattedProof,
        willObject
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

      // Save transaction records
      setTransactionRecords({
        createWillTx: createReceipt.hash,
        transferTx: transferReceipt.hash,
        willAddress: willAddress
      });

      setStatus('Will executed successfully!');
      setCurrentStep(5); // Move to success display step
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
        <div className={`step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
          <div className="step-number">1</div>
          <div className="step-label">Download</div>
        </div>
        <div className={`step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
          <div className="step-number">2</div>
          <div className="step-label">Decrypt</div>
        </div>
        <div className={`step ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}>
          <div className="step-number">3</div>
          <div className="step-label">Generate Proof</div>
        </div>
        <div className={`step ${currentStep >= 4 ? 'active' : ''} ${currentStep >= 5 ? 'completed' : ''}`}>
          <div className="step-number">4</div>
          <div className="step-label">Execute</div>
        </div>
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
            {status && <div className="status-info"><p>{status}</p></div>}

            {/* Debug helper */}
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              background: 'rgba(33, 150, 243, 0.1)',
              border: '1px solid rgba(33, 150, 243, 0.3)',
              borderRadius: '6px',
              fontSize: '0.85rem'
            }}>
              <p style={{ margin: 0, marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.9)' }}>
                🔍 <strong>Debug Helper:</strong>
              </p>
              <button
                type="button"
                onClick={() => {
                  console.log('=== localStorage Cache Check ===');
                  const keys = Object.keys(localStorage);
                  const ipfsKeys = keys.filter(k => k.startsWith('ipfs_cache_'));
                  console.log('Total IPFS cache entries:', ipfsKeys.length);
                  ipfsKeys.forEach(key => {
                    const cid = key.replace('ipfs_cache_', '');
                    const data = localStorage.getItem(key);
                    console.log('CID:', cid);
                    console.log('Data size:', data?.length, 'characters');
                    console.log('Data preview:', data?.slice(0, 100) + '...');
                  });
                  if (ipfsKeys.length === 0) {
                    console.log('⚠️ No cached data found in localStorage');
                  }
                  alert(`Found ${ipfsKeys.length} cached IPFS items. Check console for details.`);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(33, 150, 243, 0.2)',
                  color: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid rgba(33, 150, 243, 0.5)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                Check localStorage Cache
              </button>
              <p style={{ margin: 0, marginTop: '0.5rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                This will show all cached IPFS data in your browser console.
              </p>
            </div>
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

              <div style={{
                margin: '1rem 0',
                padding: '1rem',
                background: 'rgba(33, 150, 243, 0.1)',
                border: '1px solid rgba(33, 150, 243, 0.3)',
                borderRadius: '6px'
              }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.9rem'
                }}>
                  Or upload key from file:
                </label>
                <input
                  id="key-file-input"
                  type="file"
                  accept=".txt"
                  onChange={handleKeyFileUpload}
                  disabled={isLoading}
                  style={{
                    display: 'none'
                  }}
                />
                <label
                  htmlFor="key-file-input"
                  style={{
                    display: 'inline-block',
                    padding: '0.75rem 1.5rem',
                    background: 'rgba(33, 150, 243, 0.2)',
                    border: '1px solid rgba(33, 150, 243, 0.5)',
                    borderRadius: '6px',
                    color: 'rgba(255, 255, 255, 0.9)',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    opacity: isLoading ? 0.5 : 1,
                    textAlign: 'center'
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading) {
                      e.currentTarget.style.background = 'rgba(33, 150, 243, 0.3)';
                      e.currentTarget.style.borderColor = 'rgba(33, 150, 243, 0.7)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(33, 150, 243, 0.2)';
                    e.currentTarget.style.borderColor = 'rgba(33, 150, 243, 0.5)';
                  }}
                >
                  Choose Key File
                </label>
                {keyInput && (
                  <span style={{
                    marginLeft: '1rem',
                    color: 'var(--success-color)',
                    fontSize: '0.9rem'
                  }}>
                    ✓ Key loaded
                  </span>
                )}
                <p style={{
                  margin: '0.5rem 0 0 0',
                  fontSize: '0.8rem',
                  color: 'rgba(255, 255, 255, 0.6)'
                }}>
                  Upload a .txt file containing the hexadecimal decryption key
                </p>
              </div>

              <button type="submit" disabled={isLoading || !keyInput.trim()}>
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
                <div><strong>Salt:</strong> {BigInt(decryptedWill.salt)}</div>
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
                <div>- Nonce: {BigInt(decryptedWill.permit2.nonce)}</div>
                <div>- Deadline: {new Date(decryptedWill.permit2.deadline * 1000).toLocaleString('en-US')}</div>
                <div>- Signature: {decryptedWill.permit2.signature.slice(0, 40)}......{decryptedWill.permit2.signature.slice(-25)} ({decryptedWill.permit2.signature.length} bytes)</div>
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

        {currentStep === 5 && transactionRecords && decryptedWill && (
          <div className="success-container" style={{
            background: 'rgba(76, 175, 80, 0.1)',
            border: '2px solid var(--success-color)',
            borderRadius: '12px',
            padding: '2rem',
            marginTop: '1rem'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</div>
              <h3 style={{ color: 'var(--success-color)', marginTop: 0 }}>
                Will Executed Successfully!
              </h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                Assets have been transferred to all beneficiaries
              </p>
            </div>

            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '1.5rem',
              borderRadius: '8px',
              marginBottom: '1.5rem'
            }}>
              <h4 style={{ color: 'var(--success-color)', marginTop: 0, marginBottom: '1rem' }}>
                Transaction Records
              </h4>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.9rem',
                  marginBottom: '0.5rem'
                }}>
                  Will Contract Address:
                </label>
                <code style={{
                  display: 'block',
                  wordBreak: 'break-all',
                  background: '#1a1a1a',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  color: 'var(--success-color)',
                  fontSize: '0.9rem'
                }}>
                  {transactionRecords.willAddress}
                </code>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.9rem',
                  marginBottom: '0.5rem'
                }}>
                  Create Will Transaction:
                </label>
                <code style={{
                  display: 'block',
                  wordBreak: 'break-all',
                  background: '#1a1a1a',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.85rem'
                }}>
                  {transactionRecords.createWillTx}
                </code>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.9rem',
                  marginBottom: '0.5rem'
                }}>
                  Asset Transfer Transaction:
                </label>
                <code style={{
                  display: 'block',
                  wordBreak: 'break-all',
                  background: '#1a1a1a',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.85rem'
                }}>
                  {transactionRecords.transferTx}
                </code>
              </div>
            </div>

            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '1.5rem',
              borderRadius: '8px',
              marginBottom: '1.5rem'
            }}>
              <h4 style={{ color: 'rgba(255, 255, 255, 0.9)', marginTop: 0, marginBottom: '1rem' }}>
                Transfer Summary
              </h4>
              <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                {decryptedWill.estates.map((estate, idx) => (
                  <div key={idx} style={{
                    padding: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '6px',
                    marginBottom: '0.5rem',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <div style={{ marginBottom: '0.25rem' }}>
                      <strong style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Beneficiary:</strong> {estate.beneficiary}
                    </div>
                    <div style={{ marginBottom: '0.25rem' }}>
                      <strong style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Token:</strong> {estate.token}
                    </div>
                    <div>
                      <strong style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Amount:</strong> {estate.amount}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleReset}
              style={{
                width: '100%',
                padding: '1rem',
                background: 'var(--primary-color)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Start Over
            </button>
          </div>
        )}

        {error && <div className="error">{error}</div>}
      </div>
    </div>
  );
};

export default ExecutorPage;
