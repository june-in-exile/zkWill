import React, { useState } from 'react';
import { useWallet } from '@hooks/useWallet';
import { notarizeCid } from '@utils/contract/willFactory';
import './NotaryPage.css';

interface PendingWill {
  cid: string;
  testator: string;
  uploadTimestamp: number;
  isNotarized: boolean;
}

const NotaryPage: React.FC = () => {
  const { isConnected, signer } = useWallet();
  const [cidInput, setCidInput] = useState('');
  const [isNotarizing, setIsNotarizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Mock pending wills - in real app, fetch from contract
  const [pendingWills] = useState<PendingWill[]>([
    {
      cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      testator: '0x1234...5678',
      uploadTimestamp: Date.now() - 3600000,
      isNotarized: false,
    },
  ]);

  const handleNotarize = async (cid: string) => {
    if (!signer) {
      setError('Please connect your wallet');
      return;
    }

    setIsNotarizing(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('Notarizing CID:', cid);

      const receipt = await notarizeCid(signer, cid);

      console.log('CID notarized successfully:', receipt.hash);
      setSuccess(`Successfully notarized CID: ${cid}`);
      setCidInput('');
    } catch (err) {
      console.error('Notarization error:', err);
      setError(err instanceof Error ? err.message : 'Notarization failed');
    } finally {
      setIsNotarizing(false);
    }
  };

  const handleManualNotarize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cidInput.trim()) {
      setError('Please enter a CID');
      return;
    }
    await handleNotarize(cidInput);
  };

  if (!isConnected) {
    return (
      <div className="notary-page">
        <div className="connect-prompt">
          <h2>Connect Wallet</h2>
          <p>Please connect your wallet to notarize wills</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notary-page">
      <div className="page-header">
        <h1>Notary Dashboard</h1>
        <p>Review and notarize uploaded wills</p>
      </div>

      <div className="card">
        <h2>Manual Notarization</h2>
        <form onSubmit={handleManualNotarize} className="notarize-form">
          <div className="form-group">
            <label>Enter CID to Notarize</label>
            <input
              type="text"
              value={cidInput}
              onChange={(e) => setCidInput(e.target.value)}
              placeholder="bafybeigdyrzt..."
              disabled={isNotarizing}
            />
          </div>
          <button type="submit" disabled={isNotarizing}>
            {isNotarizing ? 'Notarizing...' : 'Notarize CID'}
          </button>
        </form>

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}
      </div>

      <div className="card">
        <h2>Pending Wills</h2>
        {pendingWills.length === 0 ? (
          <p className="empty-state">No pending wills to notarize</p>
        ) : (
          <div className="wills-list">
            {pendingWills.map((will) => (
              <div key={will.cid} className="will-item">
                <div className="will-info">
                  <div className="info-row">
                    <span className="label">CID:</span>
                    <code>{will.cid}</code>
                  </div>
                  <div className="info-row">
                    <span className="label">Testator:</span>
                    <span>{will.testator}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Uploaded:</span>
                    <span>{new Date(will.uploadTimestamp).toLocaleString()}</span>
                  </div>
                </div>
                {!will.isNotarized && (
                  <button
                    onClick={() => handleNotarize(will.cid)}
                    disabled={isNotarizing}
                    className="btn-notarize"
                  >
                    Notarize
                  </button>
                )}
                {will.isNotarized && <span className="badge-success">Notarized</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotaryPage;
