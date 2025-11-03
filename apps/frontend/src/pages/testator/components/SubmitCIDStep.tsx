import React, { useState } from 'react';
import { generateCidUploadProof } from '@utils/api/client';
import { uploadCid } from '@utils/contract/willFactory';
import { useWallet } from '@hooks/useWallet';
import { formatProofForContract } from '@utils/zkp/snarkjs';
import type { EncryptedData } from '../TestatorPage';

// Convert EncryptedData to TypedJsonObject format for contract
function encryptedDataToTypedJsonObject(encryptedData: EncryptedData) {
  const keys: string[] = [];
  const values: Array<{
    value: string;
    numberArray: string[];
    valueType: number;
  }> = [];

  // algorithm (STRING = 0)
  keys.push("algorithm");
  values.push({
    value: encryptedData.encrypted.algorithm,
    numberArray: [],
    valueType: 0,
  });

  // iv (NUMBER_ARRAY = 2)
  keys.push("iv");
  values.push({
    value: "",
    numberArray: encryptedData.encrypted.iv.map((n: number) => n.toString()),
    valueType: 2,
  });

  // authTag (NUMBER_ARRAY = 2)
  keys.push("authTag");
  values.push({
    value: "",
    numberArray: encryptedData.encrypted.authTag.map((n: number) => n.toString()),
    valueType: 2,
  });

  // ciphertext (NUMBER_ARRAY = 2)
  keys.push("ciphertext");
  values.push({
    value: "",
    numberArray: encryptedData.encrypted.ciphertext.map((n: number) => n.toString()),
    valueType: 2,
  });

  // timestamp (NUMBER = 1)
  keys.push("timestamp");
  values.push({
    value: encryptedData.encrypted.timestamp.toString(),
    numberArray: [],
    valueType: 1,
  });

  return { keys, values };
}

interface Props {
  cid: string;
  encryptedData: EncryptedData;
  witnesses: [string, string];
  onSubmitted: () => void;
}

const SubmitCIDStep: React.FC<Props> = ({ cid, encryptedData, witnesses, onSubmitted }) => {
  const { signer } = useWallet();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [proof, setProof] = useState<any>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerateProof = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      setStatus('Sending data to backend for ZKP generation...');
      setProgress(10);

      const generatedProof = await generateCidUploadProof(
        encryptedData.encrypted.ciphertext,
        Array.from(encryptedData.key),
        encryptedData.encrypted.iv
      );

      setStatus('ZKP proof generated successfully!');
      setProgress(100);
      setProof(generatedProof);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Proof generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!proof || !signer) return;

    setIsSubmitting(true);
    setError(null);

    try {
      console.log('Submitting CID to WillFactory:', cid);
      console.log('Witnesses:', witnesses);

      const formattedProof = formatProofForContract(proof);
      const willObject = encryptedDataToTypedJsonObject(encryptedData);

      const receipt = await uploadCid(signer, cid, formattedProof, willObject, witnesses);

      console.log('CID uploaded successfully:', receipt.hash);
      setIsSubmitted(true);
      setTxHash(receipt.hash);
    } catch (err) {
      console.error('Submission error:', err);
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCID = () => {
    navigator.clipboard.writeText(cid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleComplete = () => {
    onSubmitted();
  };

  return (
    <div className="submit-cid-step">
      <h2>Submit CID to Blockchain</h2>

      <div className="cid-info">
        <label>IPFS CID:</label>
        <code>{cid}</code>
      </div>

      {!isSubmitted ? (
        <>
          {!proof ? (
            <>
              <p>Generate a zero-knowledge proof to verify your encrypted will.</p>
              <div className="info-box">
                <p>⚠️ This may take minutes depending on your device.</p>
                <p>The page may become unresponsive during proof generation.</p>
              </div>

              {isGenerating && (
                <div className="progress-info">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                  </div>
                  <p>{status}</p>
                </div>
              )}

              {error && <div className="error">{error}</div>}

              <button onClick={handleGenerateProof} disabled={isGenerating} className="btn-primary">
                {isGenerating ? 'Generating Proof...' : 'Generate ZK Proof'}
              </button>
            </>
          ) : (
            <>
              <div className="success">✓ Proof generated successfully!</div>
              <p>Now submit the CID and proof to the WillFactory contract.</p>

              {error && <div className="error">{error}</div>}

              <button onClick={handleSubmit} disabled={isSubmitting} className="btn-primary">
                {isSubmitting ? 'Submitting...' : 'Submit to Blockchain'}
              </button>
            </>
          )}
        </>
      ) : (
        <>
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
                Will Successfully Submitted!
              </h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                Your encrypted will has been uploaded to the blockchain
              </p>
            </div>

            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '1.5rem',
              borderRadius: '8px',
              marginBottom: '1.5rem'
            }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.9rem',
                  marginBottom: '0.5rem'
                }}>
                  IPFS CID:
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: '#1a1a1a',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)'
                }}>
                  <code style={{
                    flex: 1,
                    wordBreak: 'break-all',
                    color: 'var(--success-color)',
                    fontSize: '0.95rem'
                  }}>
                    {cid}
                  </code>
                  <button
                    onClick={handleCopyCID}
                    style={{
                      padding: '0.5rem 1rem',
                      background: copied ? 'var(--success-color)' : 'var(--primary-color)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s'
                    }}
                  >
                    {copied ? '✓ Copied!' : '📋 Copy'}
                  </button>
                </div>
              </div>

              {txHash && (
                <div>
                  <label style={{
                    display: 'block',
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '0.9rem',
                    marginBottom: '0.5rem'
                  }}>
                    Transaction Hash:
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
                    {txHash}
                  </code>
                </div>
              )}
            </div>

            <div style={{
              background: 'rgba(33, 150, 243, 0.1)',
              border: '1px solid rgba(33, 150, 243, 0.3)',
              borderRadius: '6px',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <p style={{
                margin: 0,
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '0.9rem',
                lineHeight: '1.6'
              }}>
                💡 <strong>Important:</strong> Save this CID! You'll need it to:
              </p>
              <ul style={{
                marginTop: '0.5rem',
                marginBottom: 0,
                paddingLeft: '2rem',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.9rem'
              }}>
                <li>Have the Notary verify and notarize your will</li>
                <li>Have the Oracle probate your will after death confirmation</li>
                <li>Allow the Executor to download and execute your will</li>
              </ul>
            </div>

            <button
              onClick={handleComplete}
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
              onMouseOver={(e) => e.currentTarget.style.background = 'var(--primary-hover)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'var(--primary-color)'}
            >
              Complete & Start Over
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default SubmitCIDStep;
