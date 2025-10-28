import React, { useState, useEffect } from 'react';
import { useWallet } from '@hooks/useWallet';
import { probateCid, getWillFactoryContract } from '@utils/contract/willFactory';
import './OraclePage.css';

interface NotarizedWill {
  cid: string;
  testator: string;
  notarizedTimestamp: number;
  isProbated: boolean;
}

const OraclePage: React.FC = () => {
  const { isConnected, signer, address } = useWallet();
  const [cidInput, setCidInput] = useState('');
  const [isProbating, setIsProbating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [oracleAddress, setOracleAddress] = useState<string | null>(null);
  const [isCheckingOracle, setIsCheckingOracle] = useState(false);

  // Mock notarized wills - in real app, fetch from contract
  const [notarizedWills] = useState<NotarizedWill[]>([
    {
      cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      testator: '0x1234...5678',
      notarizedTimestamp: Date.now() - 7200000,
      isProbated: false,
    },
  ]);

  // Fetch oracle address from contract
  useEffect(() => {
    const fetchOracleAddress = async () => {
      if (!signer) return;

      setIsCheckingOracle(true);
      try {
        const contract = getWillFactoryContract(signer);
        const oracle = await contract.oracle();
        setOracleAddress(oracle);
      } catch (err) {
        console.error('Failed to fetch oracle address:', err);
      } finally {
        setIsCheckingOracle(false);
      }
    };

    fetchOracleAddress();
  }, [signer]);

  // Check if current user is the oracle
  const isOracle = oracleAddress && address && oracleAddress.toLowerCase() === address.toLowerCase();

  const handleProbate = async (cid: string) => {
    if (!signer) {
      setError('Please connect your wallet');
      return;
    }

    setIsProbating(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('Probating CID:', cid);

      const receipt = await probateCid(signer, cid);

      console.log('CID probated successfully:', receipt.hash);
      setSuccess(`Successfully probated CID: ${cid}`);
      setCidInput('');
    } catch (err) {
      console.error('Probation error:', err);
      setError(err instanceof Error ? err.message : 'Probation failed');
    } finally {
      setIsProbating(false);
    }
  };

  const handleManualProbate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cidInput.trim()) {
      setError('Please enter a CID');
      return;
    }
    await handleProbate(cidInput);
  };

  if (!isConnected) {
    return (
      <div className="oracle-page">
        <div className="connect-prompt">
          <h2>Connect Wallet</h2>
          <p>Please connect your wallet to probate wills</p>
        </div>
      </div>
    );
  }

  return (
    <div className="oracle-page">
      <div className="page-header">
        <h1>Oracle Dashboard</h1>
        <p>Authorize will execution after death confirmation</p>
      </div>

      {/* Account verification warning */}
      {!isCheckingOracle && oracleAddress && !isOracle && (
        <div className="card account-warning-card">
          <h3>⚠️ Wrong Account</h3>
          <p>You are not authorized to probate wills.</p>
          <div className="account-details">
            <div>
              <strong>Your address:</strong>
              <code>{address}</code>
            </div>
            <div>
              <strong>Required oracle address:</strong>
              <code>{oracleAddress}</code>
            </div>
          </div>
          <p className="help-text">
            Please switch to the oracle account in your wallet to continue.
          </p>
        </div>
      )}

      {isOracle && (
        <div className="card success-card">
          <p>✓ Authorized as Oracle</p>
        </div>
      )}

      <div className="warning-card">
        <h3>⚠️ Important Notice</h3>
        <p>
          As an Oracle, you are responsible for verifying the testator's death through authoritative
          sources before probating their will. This action authorizes the executor to proceed with
          asset distribution.
        </p>
      </div>

      <div className="card">
        <h2>Manual Probation</h2>
        <form onSubmit={handleManualProbate} className="probate-form">
          <div className="form-group">
            <label>Enter CID to Probate</label>
            <input
              type="text"
              value={cidInput}
              onChange={(e) => setCidInput(e.target.value)}
              placeholder="bafybeigdyrzt..."
              disabled={isProbating}
            />
          </div>
          <button type="submit" disabled={isProbating || !isOracle}>
            {isProbating ? 'Probating...' : 'Probate CID'}
          </button>
          {!isOracle && oracleAddress && (
            <p className="disabled-hint">Button disabled: Wrong account</p>
          )}
        </form>

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}
      </div>

      <div className="card">
        <h2>Notarized Wills (Mocked)</h2>
        {notarizedWills.length === 0 ? (
          <p className="empty-state">No notarized wills available</p>
        ) : (
          <div className="wills-list">
            {notarizedWills.map((will) => (
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
                    <span className="label">Notarized:</span>
                    <span>{new Date(will.notarizedTimestamp).toLocaleString()}</span>
                  </div>
                </div>
                {!will.isProbated && (
                  <button
                    onClick={() => handleProbate(will.cid)}
                    disabled={isProbating || !isOracle}
                    className="btn-probate"
                  >
                    Probate
                  </button>
                )}
                {will.isProbated && <span className="badge-success">Probated</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OraclePage;
