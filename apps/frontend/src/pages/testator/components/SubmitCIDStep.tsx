import React, { useState } from 'react';
import { generateProof, formatProofForContract } from '@utils/zkp/snarkjs';
import { uploadCid } from '@utils/contract/willFactory';
import { useWallet } from '@hooks/useWallet';
import type { EncryptedData } from '../TestatorPage';

interface Props {
  cid: string;
  encryptedData: EncryptedData;
  onSubmitted: () => void;
}

const SubmitCIDStep: React.FC<Props> = ({ cid, encryptedData, onSubmitted }) => {
  const { signer } = useWallet();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [proof, setProof] = useState<any>(null);

  const handleGenerateProof = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const zkpInput = {
        ciphertext: encryptedData.encrypted.ciphertext,
        key: Array.from(encryptedData.key),
        iv: encryptedData.encrypted.iv,
      };

      const generatedProof = await generateProof('cidUpload', zkpInput, (s, p) => {
        setStatus(s);
        setProgress(p);
      });

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

      const formattedProof = formatProofForContract(proof);

      const receipt = await uploadCid(signer, cid, formattedProof);

      console.log('CID uploaded successfully:', receipt.hash);
      onSubmitted();
    } catch (err) {
      console.error('Submission error:', err);
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="submit-cid-step">
      <h2>Submit CID to Blockchain</h2>

      <div className="cid-info">
        <label>IPFS CID:</label>
        <code>{cid}</code>
      </div>

      {!proof ? (
        <>
          <p>Generate a zero-knowledge proof to verify your encrypted will.</p>
          <div className="info-box">
            <p>⚠️ This may take 5-15 minutes depending on your device.</p>
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
    </div>
  );
};

export default SubmitCIDStep;
