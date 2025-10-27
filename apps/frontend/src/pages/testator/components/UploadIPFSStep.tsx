import React, { useState } from 'react';
import { uploadToIPFS } from '@utils/ipfs/helia';
import type { EncryptedData } from '../TestatorPage';

interface Props {
  encryptedData: EncryptedData;
  onUploaded: (cid: string) => void;
}

const UploadIPFSStep: React.FC<Props> = ({ encryptedData, onUploaded }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    setIsUploading(true);
    setError(null);

    try {
      const cid = await uploadToIPFS(encryptedData.encrypted);
      onUploaded(cid);
    } catch (err) {
      console.error('IPFS upload failed:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="upload-step">
      <h2>Upload to IPFS</h2>
      <p>Upload your encrypted will to IPFS for decentralized storage.</p>

      <div className="info-box">
        <p>This will create a Helia (IPFS) node in your browser and upload the encrypted data.</p>
        <p>Note: For demo purposes, the data is stored temporarily in your local node.</p>
      </div>

      {error && <div className="error">{error}</div>}

      <button onClick={handleUpload} disabled={isUploading} className="btn-primary">
        {isUploading ? (
          <>
            <span className="loading"></span> Uploading to IPFS...
          </>
        ) : (
          'Upload to IPFS'
        )}
      </button>
    </div>
  );
};

export default UploadIPFSStep;
