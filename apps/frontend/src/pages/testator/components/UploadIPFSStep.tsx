import React, { useState } from 'react';
import { uploadToIPFS, downloadFromIPFS } from '@utils/ipfs/helia';
import type { EncryptedData } from '../TestatorPage';

interface Props {
  encryptedData: EncryptedData;
  onUploaded: (cid: string) => void;
}

const UploadIPFSStep: React.FC<Props> = ({ encryptedData, onUploaded }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [verificationResult, setVerificationResult] = useState<string | null>(null);

  const handleUpload = async () => {
    setIsUploading(true);
    setError(null);
    setUploadStatus('');
    setVerificationResult(null);

    try {
      // DEBUG: Log encrypted data before upload
      console.log('=== DEBUG: Encrypted Data to Upload ===');
      console.log('Full encrypted data:', encryptedData.encrypted);
      console.log('Encrypted data type:', typeof encryptedData.encrypted);
      console.log('Encrypted data keys:', Object.keys(encryptedData.encrypted || {}));
      console.log('Encryption key length:', encryptedData.key.length);

      // Convert key to hex for display
      const keyHex = Array.from(encryptedData.key)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      console.log('Encryption key (hex):', keyHex);
      console.log('=====================================');

      setUploadStatus('Uploading to IPFS...');
      const cid = await uploadToIPFS(encryptedData.encrypted);

      console.log('✅ Upload successful! CID:', cid);
      setUploadStatus(`Upload successful! CID: ${cid}`);

      // Immediately test download to verify upload
      setUploadStatus('Verifying upload by downloading...');
      console.log('🔍 Attempting to download immediately to verify...');

      try {
        const downloaded = await downloadFromIPFS(cid);
        console.log('✅ Download verification successful!');
        console.log('Downloaded data:', downloaded);

        // Compare uploaded vs downloaded
        const uploadedStr = JSON.stringify(encryptedData.encrypted);
        const downloadedStr = JSON.stringify(downloaded);
        const isMatch = uploadedStr === downloadedStr;

        console.log('Upload vs Download match:', isMatch);
        console.log('Uploaded size:', uploadedStr.length);
        console.log('Downloaded size:', downloadedStr.length);

        if (isMatch) {
          setVerificationResult('✅ Verification successful: Downloaded data matches uploaded data!');
        } else {
          setVerificationResult('⚠️ Warning: Downloaded data does not match uploaded data');
          console.error('Data mismatch!');
          console.error('Uploaded:', uploadedStr.slice(0, 200));
          console.error('Downloaded:', downloadedStr.slice(0, 200));
        }
      } catch (downloadErr) {
        console.error('❌ Download verification failed:', downloadErr);
        setVerificationResult(`⚠️ Could not verify upload: ${downloadErr instanceof Error ? downloadErr.message : 'Download failed'}`);
      }

      onUploaded(cid);
    } catch (err) {
      console.error('❌ IPFS upload failed:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Convert key to hex for display
  const keyHex = Array.from(encryptedData.key)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return (
    <div className="upload-step">
      <h2>Upload to IPFS</h2>
      <p>Upload your encrypted will to IPFS for decentralized storage.</p>

      <div className="info-box">
        <p>This will create a Helia (IPFS) node in your browser and upload the encrypted data.</p>
        <p>Note: For demo purposes, the data is stored temporarily in your local node.</p>
      </div>

      {/* DEBUG: Display encrypted data details */}
      <div className="debug-info" style={{
        background: '#0f011ef8',
        padding: '15px',
        marginBottom: '15px',
        borderRadius: '5px',
        fontFamily: 'monospace',
        fontSize: '12px',
        color: 'rgba(255, 255, 255, 0.9)'
      }}>
        <h4 style={{ marginTop: 0, marginBottom: '15px', color: 'rgba(255, 255, 255, 0.95)' }}>Encrypted Data Details</h4>

        <div style={{ marginBottom: '10px' }}>
          <strong style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Algorithm:</strong>
          <div style={{
            background: 'white',
            color: '#000',
            padding: '8px',
            marginTop: '5px',
            borderRadius: '3px',
            wordBreak: 'break-all'
          }}>
            {encryptedData.encrypted.algorithm}
          </div>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <strong style={{ color: 'rgba(255, 255, 255, 0.9)' }}>IV:</strong>
          <div style={{
            background: 'white',
            color: '#000',
            padding: '8px',
            marginTop: '5px',
            borderRadius: '3px',
            wordBreak: 'break-all',
            overflowX: 'auto',
            whiteSpace: 'nowrap'
          }}>
            [{encryptedData.encrypted.iv.join(', ')}]
          </div>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <strong style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Auth Tag:</strong>
          <div style={{
            background: 'white',
            color: '#000',
            padding: '8px',
            marginTop: '5px',
            borderRadius: '3px',
            wordBreak: 'break-all',
            overflowX: 'auto',
            whiteSpace: 'nowrap'
          }}>
            [{encryptedData.encrypted.authTag.join(', ')}]
          </div>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <strong style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Ciphertext:</strong>
          <div style={{
            background: 'white',
            color: '#000',
            padding: '8px',
            marginTop: '5px',
            borderRadius: '3px',
            wordBreak: 'break-all',
            overflowX: 'auto',
            whiteSpace: 'nowrap'
          }}>
            [{encryptedData.encrypted.ciphertext.join(', ')}]
          </div>
        </div>

        <div>
          <strong style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Encryption Timestamp:</strong>
          <div style={{
            background: 'white',
            color: '#000',
            padding: '8px',
            marginTop: '5px',
            borderRadius: '3px',
            wordBreak: 'break-all'
          }}>
            {encryptedData.encrypted.timestamp} ({new Date(encryptedData.encrypted.timestamp * 1000).toLocaleString()})
          </div>
        </div>
      </div>

      {uploadStatus && (
        <div className="status-info" style={{
          
          background: '#e3f2fd',
          padding: '10px',
          marginBottom: '10px',
          borderRadius: '5px'
        }}>
          <p style={{ margin: 0 }}>{uploadStatus}</p>
        </div>
      )}

      {verificationResult && (
        <div className={verificationResult.includes('✅') ? 'success' : 'warning'} style={{
          padding: '10px',
          marginBottom: '10px',
          borderRadius: '5px'
        }}>
          {verificationResult}
        </div>
      )}

      {error && <div className="error">{error}</div>}

      <button onClick={handleUpload} disabled={isUploading} className="btn-primary">
        {isUploading ? (
          <>
            <span className="loading"></span> {uploadStatus || 'Uploading to IPFS...'}
          </>
        ) : (
          'Upload to IPFS'
        )}
      </button>

      <div style={{
        marginTop: '15px',
        padding: '10px',
        background: '#59564cff',
        borderRadius: '5px',
        fontSize: '13px'
      }}>
        <p style={{ margin: 0 }}>
          📝 <strong>Note:</strong> Check the browser console for detailed debug logs during upload and verification.
        </p>
      </div>
    </div>
  );
};

export default UploadIPFSStep;
