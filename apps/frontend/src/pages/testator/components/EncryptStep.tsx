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
import { predictWillAddress } from '@utils/contract/predictWill';
import { generateWillPermit2Signature } from '@utils/permit2/signature';
import { encryptWill as encryptWillAPI, generateSalt as generateSaltAPI } from '@utils/api/client';
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
  const { signer, provider, chainId } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const [signedWillData, setSignedWillData] = useState<SignedWill | null>(null);

  const handleEncryptProcess = async () => {
    if (!signer || !provider) {
      setError('Wallet not connected');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Step 1: Generate salt via backend API
      setProgress('Generating salt for Will contract...');
      const saltString = await generateSaltAPI();
      const salt = BigInt(saltString);
      console.log('Generated salt:', salt.toString());

      // Step 2: Predict Will contract address
      setProgress('Predicting Will contract address...');
      const willAddress = await predictWillAddress(salt, willData, provider);
      console.log('Predicted Will address:', willAddress);

      // Step 3: Generate Permit2 signature (requires user wallet signature)
      setProgress('Generating Permit2 signature (please sign in wallet)...');
      const permit2Data = await generateWillPermit2Signature(
        willData,
        willAddress,
        signer,
        chainId ?? undefined
      );
      console.log('Permit2 signature generated');
      console.log('  Nonce:', permit2Data.nonce.toString());
      console.log('  Deadline:', new Date(permit2Data.deadline * 1000).toISOString());
      console.log('  Signature:', permit2Data.signature.slice(0, 20) + '...');

      // Step 4: Build complete SignedWill object
      setProgress('Building signed will structure...');
      const signedWill: SignedWill = {
        testator: willData.testator,
        executor: willData.executor,
        estates: willData.beneficiaries.map((b) => ({
          beneficiary: b.address,
          token: b.token,
          amount: b.amount,
        })),
        salt: salt.toString(),
        will: willAddress,
        permit2: {
          nonce: permit2Data.nonce.toString(),
          deadline: permit2Data.deadline, // Already a number
          signature: permit2Data.signature,
        },
      };

      setSignedWillData(signedWill);

      // Step 5 & 6: Serialize and encrypt via backend API (combined)
      setProgress('Serializing and encrypting will via backend...');
      const encryptedResult = await encryptWillAPI(signedWill);
      console.log('Will encrypted successfully');

      // Step 7: Download encryption key for user
      setProgress('Downloading encryption key...');
      const keyHex = encryptedResult.key
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      const keyBlob = new Blob([keyHex], { type: 'text/plain' });
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

      <div className="info-box">
        <h3>This step will:</h3>
        <ol>
          <li>Generate a unique salt for your Will contract</li>
          <li>Predict the Will contract address (using CREATE2)</li>
          <li>
            Generate Permit2 signature <strong>(requires wallet confirmation)</strong>
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
            <span>{willData.beneficiaries.length}</span>
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
