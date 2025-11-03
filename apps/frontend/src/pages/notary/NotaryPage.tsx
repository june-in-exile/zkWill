import React, { useState, useEffect } from 'react';
import { useWallet } from '@hooks/useWallet';
import { notarizeCid, getWillFactoryContract } from '@utils/contract/willFactory';
import { signMessage, recoverSigner } from '@shared/utils/cryptography/signature.js';
import './NotaryPage.css';

interface PendingWill {
  cid: string;
  testator: string;
  uploadTimestamp: number;
  isNotarized: boolean;
}

// LocalStorage keys for persisting form data
const STORAGE_KEYS = {
  CID: 'notary_cid_input',
  WITNESS1_ADDRESS: 'notary_witness1_address',
  WITNESS2_ADDRESS: 'notary_witness2_address',
  WITNESS1_SIG: 'notary_witness1_signature',
  WITNESS2_SIG: 'notary_witness2_signature',
};

const NotaryPage: React.FC = () => {
  const { isConnected, signer, address } = useWallet();
  const [cidInput, setCidInput] = useState('');
  const [isNotarizing, setIsNotarizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [notaryAddress, setNotaryAddress] = useState<string | null>(null);
  const [isCheckingNotary, setIsCheckingNotary] = useState(false);

  // Witness signature states
  const [witness1Address, setWitness1Address] = useState('');
  const [witness2Address, setWitness2Address] = useState('');
  const [witness1Signature, setWitness1Signature] = useState('');
  const [witness2Signature, setWitness2Signature] = useState('');
  const [isSigning1, setIsSigning1] = useState(false);
  const [isSigning2, setIsSigning2] = useState(false);
  const [isFetchingWitnesses, setIsFetchingWitnesses] = useState(false);

  // Mock pending wills - in real app, fetch from contract
  const [pendingWills] = useState<PendingWill[]>([
    {
      cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      testator: '0x1234...5678',
      uploadTimestamp: Date.now() - 3600000,
      isNotarized: false,
    },
  ]);

  // Restore form data from localStorage on mount
  useEffect(() => {
    const savedCid = localStorage.getItem(STORAGE_KEYS.CID);
    const savedWitness1Addr = localStorage.getItem(STORAGE_KEYS.WITNESS1_ADDRESS);
    const savedWitness2Addr = localStorage.getItem(STORAGE_KEYS.WITNESS2_ADDRESS);
    const savedWitness1Sig = localStorage.getItem(STORAGE_KEYS.WITNESS1_SIG);
    const savedWitness2Sig = localStorage.getItem(STORAGE_KEYS.WITNESS2_SIG);

    if (savedCid) setCidInput(savedCid);
    if (savedWitness1Addr) setWitness1Address(savedWitness1Addr);
    if (savedWitness2Addr) setWitness2Address(savedWitness2Addr);
    if (savedWitness1Sig) setWitness1Signature(savedWitness1Sig);
    if (savedWitness2Sig) setWitness2Signature(savedWitness2Sig);
  }, []);

  // Save CID to localStorage when it changes
  useEffect(() => {
    if (cidInput) {
      localStorage.setItem(STORAGE_KEYS.CID, cidInput);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CID);
    }
  }, [cidInput]);

  // Save witness addresses to localStorage when they change
  useEffect(() => {
    if (witness1Address) {
      localStorage.setItem(STORAGE_KEYS.WITNESS1_ADDRESS, witness1Address);
    } else {
      localStorage.removeItem(STORAGE_KEYS.WITNESS1_ADDRESS);
    }
  }, [witness1Address]);

  useEffect(() => {
    if (witness2Address) {
      localStorage.setItem(STORAGE_KEYS.WITNESS2_ADDRESS, witness2Address);
    } else {
      localStorage.removeItem(STORAGE_KEYS.WITNESS2_ADDRESS);
    }
  }, [witness2Address]);

  // Save witness signatures to localStorage when they change
  useEffect(() => {
    if (witness1Signature) {
      localStorage.setItem(STORAGE_KEYS.WITNESS1_SIG, witness1Signature);
    } else {
      localStorage.removeItem(STORAGE_KEYS.WITNESS1_SIG);
    }
  }, [witness1Signature]);

  useEffect(() => {
    if (witness2Signature) {
      localStorage.setItem(STORAGE_KEYS.WITNESS2_SIG, witness2Signature);
    } else {
      localStorage.removeItem(STORAGE_KEYS.WITNESS2_SIG);
    }
  }, [witness2Signature]);

  // Fetch notary address from contract
  useEffect(() => {
    const fetchNotaryAddress = async () => {
      if (!signer) return;

      setIsCheckingNotary(true);
      try {
        const contract = getWillFactoryContract(signer);
        const notary = await contract.notary();
        setNotaryAddress(notary);
      } catch (err) {
        console.error('Failed to fetch notary address:', err);
      } finally {
        setIsCheckingNotary(false);
      }
    };

    fetchNotaryAddress();
  }, [signer]);

  // Check if current user is the notary
  const isNotary = notaryAddress && address && notaryAddress.toLowerCase() === address.toLowerCase();

  // Fetch witness addresses from contract when CID is entered
  const handleFetchWitnesses = async () => {
    if (!signer || !cidInput.trim()) {
      setError('Please connect wallet and enter a CID first');
      return;
    }

    setIsFetchingWitnesses(true);
    setError(null);

    try {
      const contract = getWillFactoryContract(signer);
      const witnesses = await contract.getCidWitnesses(cidInput.trim());

      setWitness1Address(witnesses[0]);
      setWitness2Address(witnesses[1]);

      console.log('Fetched witnesses from contract:', witnesses);

      // Check if CID has been uploaded
      if (witnesses[0] === '0x0000000000000000000000000000000000000000') {
        setError('CID not found or not uploaded yet. Please check the CID.');
        setWitness1Address('');
        setWitness2Address('');
      }
    } catch (err) {
      console.error('Failed to fetch witnesses:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch witness addresses');
      setWitness1Address('');
      setWitness2Address('');
    } finally {
      setIsFetchingWitnesses(false);
    }
  };

  // Sign CID as witness
  const handleSignAsWitness = async (witnessNumber: 1 | 2) => {
    if (!signer || !cidInput.trim()) {
      setError('Please connect wallet and enter a CID first');
      return;
    }

    // Check if witnesses have been fetched
    if (!witness1Address || !witness2Address) {
      setError('Please fetch witness addresses first by clicking "Fetch Witnesses" button');
      return;
    }

    const expectedAddress = witnessNumber === 1 ? witness1Address : witness2Address;
    const setSigningState = witnessNumber === 1 ? setIsSigning1 : setIsSigning2;
    const setSignature = witnessNumber === 1 ? setWitness1Signature : setWitness2Signature;

    // Verify current wallet matches expected witness address
    if (address?.toLowerCase() !== expectedAddress.toLowerCase()) {
      setError(
        `Wrong wallet! Witness ${witnessNumber} must sign with address ${expectedAddress}, but you're connected with ${address}. Please switch your wallet.`
      );
      return;
    }

    setSigningState(true);
    setError(null);

    try {
      // Use the shared signMessage function - same as backend!
      const cid = cidInput.trim();
      const signature = await signMessage(cid, signer);

      setSignature(signature);
      console.log(`Witness ${witnessNumber} signature:`, signature);
      console.log(`Signed by address:`, address);
      console.log(`CID:`, cid);
    } catch (err) {
      console.error(`Witness ${witnessNumber} signing error:`, err);
      setError(err instanceof Error ? err.message : `Witness ${witnessNumber} signing failed`);
    } finally {
      setSigningState(false);
    }
  };

  const handleNotarize = async (cid: string) => {
    if (!signer) {
      setError('Please connect your wallet');
      return;
    }

    if (!witness1Signature || !witness2Signature) {
      setError('Both witness signatures are required before notarization');
      return;
    }

    setIsNotarizing(true);
    setError(null);
    setSuccess(null);
    setTxHash(null);

    try {
      console.log('Notarizing CID:', cid);
      console.log('Witness 1 Address (contract):', witness1Address);
      console.log('Witness 2 Address (contract):', witness2Address);
      console.log('Witness 1 Signature:', witness1Signature);
      console.log('Witness 2 Signature:', witness2Signature);

      // Verify signature recovery locally before sending
      // Use the shared recoverSigner function - same as backend!
      const recovered1 = await recoverSigner(cid, witness1Signature);
      const recovered2 = await recoverSigner(cid, witness2Signature);

      console.log('Recovered address from signature 1:', recovered1);
      console.log('Recovered address from signature 2:', recovered2);

      if (recovered1.toLowerCase() !== witness1Address.toLowerCase()) {
        setError(`Witness 1 signature mismatch! Expected ${witness1Address} but signature was from ${recovered1}`);
        return;
      }
      if (recovered2.toLowerCase() !== witness2Address.toLowerCase()) {
        setError(`Witness 2 signature mismatch! Expected ${witness2Address} but signature was from ${recovered2}`);
        return;
      }

      const receipt = await notarizeCid(signer, cid, [witness1Signature, witness2Signature]);

      console.log('CID notarized successfully:', receipt.hash);
      setSuccess(`Successfully notarized CID: ${cid}`);
      setTxHash(receipt.hash);

      // Clear form and localStorage
      setCidInput('');
      setWitness1Address('');
      setWitness2Address('');
      setWitness1Signature('');
      setWitness2Signature('');
      localStorage.removeItem(STORAGE_KEYS.CID);
      localStorage.removeItem(STORAGE_KEYS.WITNESS1_ADDRESS);
      localStorage.removeItem(STORAGE_KEYS.WITNESS2_ADDRESS);
      localStorage.removeItem(STORAGE_KEYS.WITNESS1_SIG);
      localStorage.removeItem(STORAGE_KEYS.WITNESS2_SIG);
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

  const handleClearForm = () => {
    if (confirm('Clear all form data and signatures?')) {
      setCidInput('');
      setWitness1Address('');
      setWitness2Address('');
      setWitness1Signature('');
      setWitness2Signature('');
      setError(null);
      setSuccess(null);
      setTxHash(null);
      localStorage.removeItem(STORAGE_KEYS.CID);
      localStorage.removeItem(STORAGE_KEYS.WITNESS1_ADDRESS);
      localStorage.removeItem(STORAGE_KEYS.WITNESS2_ADDRESS);
      localStorage.removeItem(STORAGE_KEYS.WITNESS1_SIG);
      localStorage.removeItem(STORAGE_KEYS.WITNESS2_SIG);
    }
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
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          background: 'rgba(33, 150, 243, 0.1)',
          border: '1px solid rgba(33, 150, 243, 0.3)',
          borderRadius: '6px',
          fontSize: '0.9rem'
        }}>
          <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.9)' }}>
            💡 <strong>Process:</strong> Witnesses can connect and sign the CID. Final submission requires the Notary account.
          </p>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>Manual Notarization</h2>
          <button
            type="button"
            onClick={handleClearForm}
            className="btn-secondary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
          >
            🗑️ Clear Form
          </button>
        </div>
        <div style={{
          padding: '0.75rem',
          marginBottom: '1rem',
          background: 'rgba(33, 150, 243, 0.1)',
          border: '1px solid rgba(33, 150, 243, 0.3)',
          borderRadius: '6px',
          fontSize: '0.85rem'
        }}>
          <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.9)' }}>
            💾 <strong>Auto-save enabled:</strong> Your form data is automatically saved. You can safely switch accounts or refresh the page.
          </p>
        </div>
        <form onSubmit={handleManualNotarize} className="notarize-form">
          <div className="form-group">
            <label>Enter CID to Notarize</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <input
                type="text"
                value={cidInput}
                onChange={(e) => setCidInput(e.target.value)}
                placeholder="bafybeigdyrzt..."
                disabled={isNotarizing}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={handleFetchWitnesses}
                disabled={isFetchingWitnesses || !cidInput.trim()}
                className="btn-secondary"
                style={{ whiteSpace: 'nowrap' }}
              >
                {isFetchingWitnesses ? 'Fetching...' : '🔍 Fetch Witnesses'}
              </button>
            </div>
            {witness1Address && witness2Address && (
              <p style={{ color: 'green', fontSize: '0.9rem', marginTop: '5px' }}>
                ✓ Witness addresses loaded from contract
              </p>
            )}
          </div>

          {/* Witness 1 Signature */}
          {witness1Address && (
            <div className="form-group">
              <label>Witness 1 Address</label>
              <input
                type="text"
                value={witness1Address}
                disabled
                style={{ background: 'rgba(0, 0, 0, 0.2)' }}
              />
              {address && address.toLowerCase() === witness1Address.toLowerCase() ? (
                <p style={{ color: '#4caf50', fontSize: '0.85rem', marginTop: '5px' }}>
                  ✓ Correct wallet connected for Witness 1
                </p>
              ) : (
                <p style={{ color: '#ff9800', fontSize: '0.85rem', marginTop: '5px' }}>
                  ⚠️ Switch to Witness 1 wallet to sign
                </p>
              )}
            </div>
          )}
          {witness1Address && (
            <div className="form-group">
              <label>Witness 1 Signature</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <input
                  type="text"
                  value={witness1Signature}
                  onChange={(e) => setWitness1Signature(e.target.value)}
                  placeholder="0x... (or click 'Sign as Witness 1' button)"
                  disabled={isSigning1}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => handleSignAsWitness(1)}
                  disabled={isSigning1 || !cidInput.trim()}
                  className="btn-secondary"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {isSigning1 ? 'Signing...' : 'Sign as Witness 1'}
                </button>
              </div>
              {witness1Signature && <p style={{ color: 'green', fontSize: '0.9rem', marginTop: '5px' }}>✓ Witness 1 signature received</p>}
            </div>
          )}

          {/* Witness 2 Signature */}
          {witness2Address && (
            <div className="form-group">
              <label>Witness 2 Address</label>
              <input
                type="text"
                value={witness2Address}
                disabled
                style={{ background: 'rgba(0, 0, 0, 0.2)' }}
              />
              {address && address.toLowerCase() === witness2Address.toLowerCase() ? (
                <p style={{ color: '#4caf50', fontSize: '0.85rem', marginTop: '5px' }}>
                  ✓ Correct wallet connected for Witness 2
                </p>
              ) : (
                <p style={{ color: '#ff9800', fontSize: '0.85rem', marginTop: '5px' }}>
                  ⚠️ Switch to Witness 2 wallet to sign
                </p>
              )}
            </div>
          )}
          {witness2Address && (
            <div className="form-group">
              <label>Witness 2 Signature</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <input
                  type="text"
                  value={witness2Signature}
                  onChange={(e) => setWitness2Signature(e.target.value)}
                  placeholder="0x... (or click 'Sign as Witness 2' button)"
                  disabled={isSigning2}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => handleSignAsWitness(2)}
                  disabled={isSigning2 || !cidInput.trim()}
                  className="btn-secondary"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {isSigning2 ? 'Signing...' : 'Sign as Witness 2'}
                </button>
              </div>
              {witness2Signature && <p style={{ color: 'green', fontSize: '0.9rem', marginTop: '5px' }}>✓ Witness 2 signature received</p>}
            </div>
          )}

          {/* Notary account verification info */}
          {!isCheckingNotary && notaryAddress && (
            <div style={{
              padding: '1rem',
              marginBottom: '1rem',
              background: isNotary ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 152, 0, 0.1)',
              border: `1px solid ${isNotary ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 152, 0, 0.3)'}`,
              borderRadius: '6px'
            }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Current Account:</strong>
                <code style={{
                  display: 'block',
                  marginTop: '0.25rem',
                  padding: '0.5rem',
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '4px',
                  fontSize: '0.85rem'
                }}>
                  {address}
                </code>
              </div>
              <div>
                <strong>Notary Address:</strong>
                <code style={{
                  display: 'block',
                  marginTop: '0.25rem',
                  padding: '0.5rem',
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '4px',
                  fontSize: '0.85rem'
                }}>
                  {notaryAddress}
                </code>
              </div>
              <p style={{
                marginTop: '0.75rem',
                marginBottom: 0,
                fontSize: '0.9rem',
                color: isNotary ? '#4caf50' : '#ff9800'
              }}>
                {isNotary ? '✓ Authorized as Notary - You can submit the notarization' : '⚠️ Not the Notary account - Switch accounts to submit'}
              </p>
            </div>
          )}

          <button type="submit" disabled={isNotarizing || !isNotary || !witness1Signature || !witness2Signature}>
            {isNotarizing ? 'Notarizing...' : 'Submit Notarization (Notary Only)'}
          </button>
          {!isNotary && notaryAddress && (
            <p className="disabled-hint">⚠️ Switch to the Notary account to submit</p>
          )}
          {(!witness1Signature || !witness2Signature) && (
            <p className="disabled-hint">Both witness signatures are required</p>
          )}
        </form>

        {error && <div className="error">{error}</div>}
        {success && (
          <div className="success">
            <div>{success}</div>
            {txHash && (
              <div style={{ marginTop: '0.5rem' }}>
                <strong>Transaction Hash:</strong>
                <code style={{
                  display: 'block',
                  wordBreak: 'break-all',
                  background: 'rgba(0, 0, 0, 0.2)',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  marginTop: '0.25rem',
                  fontSize: '0.9rem'
                }}>
                  {txHash}
                </code>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Pending Wills (Mocked)</h2>
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
                    <span>{new Date(will.uploadTimestamp).toLocaleString('en-US')}</span>
                  </div>
                </div>
                {!will.isNotarized && (
                  <button
                    onClick={() => handleNotarize(will.cid)}
                    disabled={isNotarizing || !isNotary}
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
