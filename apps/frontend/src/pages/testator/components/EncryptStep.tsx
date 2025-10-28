/**
 * Encrypt Step - Now includes:
 * 1. Generate salt
 * 2. Predict Will address
 * 3. Generate Permit2 signature
 * 4. Serialize will data
 * 5. Encrypt serialized data
 */

import React, { useState } from 'react';
import { useWallet } from '@hooks/useWallet';
import { generateWillPermit2Signature } from '@utils/permit2/signature';
import {
  encryptWill as encryptWillAPI,
  generateSalt as generateSaltAPI,
  predictWillAddress as predictWillAddressAPI
} from '@utils/api/client';
import type { WillData, EncryptedData } from '../TestatorPage';
import './EncryptStep.css';

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

interface Props {
  willData: WillData;
  onEncrypted: (data: EncryptedData) => void;
}

const EncryptStep: React.FC<Props> = ({ willData, onEncrypted }) => {
  const { signer, chainId, isConnected, isCorrectNetwork, address, expectedChainId } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const [signedWillData, setSignedWillData] = useState<SignedWill | null>(null);

  // Add network to MetaMask
  const addNetworkToMetaMask = async () => {
    if (!window.ethereum) {
      setError('MetaMask not installed');
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: '0x66eee', // 421614 in hex
            chainName: 'Arbitrum Sepolia',
            nativeCurrency: {
              name: 'ETH',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
            blockExplorerUrls: ['https://sepolia.arbiscan.io'],
          },
        ],
      });
      console.log('✅ Network added to MetaMask successfully!');
    } catch (err: any) {
      console.error('Failed to add network:', err);
      setError(`Failed to add network: ${err.message}`);
    }
  };

  const handleEncryptProcess = async () => {
    // Validate wallet connection
    if (!isConnected || !address) {
      setError('Please connect MetaMask wallet first');
      return;
    }

    if (!signer) {
      setError('Wallet not properly initialized');
      return;
    }

    // Validate network
    if (!isCorrectNetwork) {
      setError(`Wrong network! Please switch to Chain ID ${expectedChainId}`);
      return;
    }

    if (!chainId) {
      setError('Cannot get chain ID');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Step 1: Generate salt via backend API
      setProgress('Generating salt for Will contract...');
      const saltString = await generateSaltAPI();
      const salt = BigInt(saltString);

      // Step 2: Predict Will contract address via backend API
      setProgress('Predicting Will contract address...');
      const estatesForAPI = willData.estates.map((e) => ({
        beneficiary: e.beneficiary,
        token: e.token,
        amount: e.amount,
      }));
      const willAddress = await predictWillAddressAPI(
        willData.testator,
        willData.executor,
        estatesForAPI,
        saltString
      );

      // Step 3: Generate Permit2 signature (requires user wallet signature)
      setProgress('Generating Permit2 signature (please sign in wallet)...');

      // Verify signer address matches testator
      const signerAddress = await signer.getAddress();
      if (signerAddress.toLowerCase() !== willData.testator.toLowerCase()) {
        throw new Error(
          `Wallet address mismatch! Current wallet: ${signerAddress}, but testator is: ${willData.testator}. Please switch to the correct account.`
        );
      }

      const permit2Data = await generateWillPermit2Signature(
        willData,
        willAddress,
        signer,
        chainId ?? undefined
      );

      // Step 4: Build complete SignedWill object
      setProgress('Building signed will structure...');
      const signedWill: SignedWill = {
        testator: willData.testator,
        executor: willData.executor,
        estates: willData.estates.map((b) => ({
          beneficiary: b.beneficiary,
          token: b.token,
          amount: b.amount,
        })),
        salt: salt.toString(),
        will: willAddress,
        permit2: {
          nonce: permit2Data.nonce.toString(),
          deadline: permit2Data.deadline,
          signature: permit2Data.signature,
        },
      };

      setSignedWillData(signedWill);

      // Step 5 & 6: Serialize and encrypt via backend API (combined)
      setProgress('Serializing and encrypting will via backend...');
      const encryptedResult = await encryptWillAPI(signedWill);

      // Debug: Log encrypted result
      const ciphertextBase64 = btoa(String.fromCharCode(...encryptedResult.ciphertext));
      const ivBase64 = btoa(String.fromCharCode(...encryptedResult.iv));
      const authTagBase64 = btoa(String.fromCharCode(...encryptedResult.authTag));

      // Step 7: Download encryption key for user
      setProgress('Downloading encryption key...');
      const keyHexForDownload = encryptedResult.key
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const keyBlob = new Blob([keyHexForDownload], { type: 'text/plain' });
      const url = URL.createObjectURL(keyBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'will-encryption-key.txt';
      a.click();
      URL.revokeObjectURL(url);

      setProgress('Complete!');
      onEncrypted({
        encrypted: {
          algorithm: encryptedResult.algorithm,
          iv: encryptedResult.iv,
          authTag: encryptedResult.authTag,
          ciphertext: encryptedResult.ciphertext,
          timestamp: encryptedResult.timestamp,
        },
        key: new Uint8Array(encryptedResult.key),
      });
    } catch (err) {
      console.error('Encryption process failed:', err);
      setError(err instanceof Error ? err.message : 'Encryption process failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="encrypt-step">
      <h2>Sign & Encrypt Will</h2>

      {/* Wallet Connection Status */}
      {!isConnected && (
        <div className="error" style={{ marginBottom: '1rem' }}>
          ⚠️ Please connect your MetaMask wallet first
          <br />
          <small style={{ marginTop: '0.5rem', display: 'block' }}>
            Make sure MetaMask is installed and you've connected your wallet to this site.
          </small>
        </div>
      )}

      {isConnected && !isCorrectNetwork && (
        <div className="error" style={{ marginBottom: '1rem' }}>
          ⚠️ Wrong network detected! Expected Chain ID: {expectedChainId}, but connected to: {chainId}
          <br />
          Please switch your wallet to Arbitrum Sepolia.
          <br />
          <button
            onClick={addNetworkToMetaMask}
            className="btn-secondary"
            style={{ marginTop: '0.5rem' }}
          >
            ➕ Add Arbitrum Sepolia to MetaMask
          </button>
        </div>
      )}

      {isConnected && isCorrectNetwork && (
        <div className="info-box" style={{ marginBottom: '1rem', background: '#d4edda', borderColor: '#c3e6cb', color: '#155724' }}>
          ✅ Wallet Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
          <br />
          ✅ Network: Chain ID {chainId}
        </div>
      )}

      <div className="info-box">
        <h3>This step will:</h3>
        <ol>
          <li>Generate a unique salt for your Will contract</li>
          <li>Predict the Will contract address (using CREATE2)</li>
          <li>
            Generate Permit2 signature <strong>(requires wallet confirmation)</strong>
          </li>
          <li>Verify the signature from your wallet</li>
          <li>
            Compare with backend signature <strong>(using TESTATOR_PRIVATE_KEY)</strong>
          </li>
          <li>Serialize all will data into binary format</li>
          <li>Encrypt the serialized data</li>
          <li>Download the encryption key to your computer</li>
        </ol>
      </div>

      <div className="will-preview">
        <h3>Will Data Preview:</h3>
        <div className="preview-section">
          <div className="preview-row">
            <span className="label">Testator:</span>
            <code>{willData.testator}</code>
          </div>
          <div className="preview-row">
            <span className="label">Executor:</span>
            <code>{willData.executor}</code>
          </div>
          <div className="preview-row">
            <span className="label">Estates:</span>
            <span>{willData.estates.length}</span>
          </div>
        </div>

        <details>
          <summary>View full will data</summary>
          <pre>{JSON.stringify(willData, null, 2)}</pre>
        </details>
      </div>

      {signedWillData && (
        <div className="signed-data-preview">
          <h3>✅ Signed Will Data:</h3>
          <div className="preview-section">
            <div className="preview-row">
              <span className="label">Salt:</span>
              <code>{BigInt(signedWillData.salt).toString(16).slice(0, 16)}...</code>
            </div>
            <div className="preview-row">
              <span className="label">Predicted Will Address:</span>
              <code>{signedWillData.will}</code>
            </div>
            <div className="preview-row">
              <span className="label">Permit2 Nonce:</span>
              <code>{BigInt(signedWillData.permit2.nonce).toString(16).slice(0, 16)}...</code>
            </div>
            <div className="preview-row">
              <span className="label">Permit2 Deadline:</span>
              <code>{new Date(signedWillData.permit2.deadline * 1000).toLocaleString()}</code>
            </div>
            <div className="preview-row">
              <span className="label">Signature:</span>
              <code>{signedWillData.permit2.signature.slice(0, 20)}...</code>
            </div>
          </div>
        </div>
      )}

      <div className="warning-box">
        <strong>⚠️ Important:</strong> The encryption key will be downloaded to your computer.
        Keep it safe! The executor will need this key to decrypt the will.
      </div>

      {progress && <div className="progress-info">{progress}</div>}
      {error && <div className="error">{error}</div>}

      <button onClick={handleEncryptProcess} disabled={isProcessing} className="btn-primary">
        {isProcessing ? `Processing... (${progress})` : 'Sign & Encrypt Will'}
      </button>
    </div>
  );
};

export default EncryptStep;
