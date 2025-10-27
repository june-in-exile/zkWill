import React, { useState, useMemo } from 'react';
import { useWallet } from '@hooks/useWallet';
import CreateWillForm from './components/CreateWillForm';
import ApprovePermit2Step from './components/ApprovePermit2Step';
import EncryptStep from './components/EncryptStep';
import UploadIPFSStep from './components/UploadIPFSStep';
import SubmitCIDStep from './components/SubmitCIDStep';
import './TestatorPage.css';

export interface WillData {
  testator: string;
  executor: string;
  estates: Array<{
    address: string;
    token: string;
    amount: string;
  }>;
}

export interface EncryptedData {
  encrypted: any;
  key: Uint8Array;
}

const TestatorPage: React.FC = () => {
  const { isConnected, address } = useWallet();
  const [currentStep, setCurrentStep] = useState(1);
  const [willData, setWillData] = useState<WillData | null>(null);
  const [encryptedData, setEncryptedData] = useState<EncryptedData | null>(null);
  const [cid, setCid] = useState<string | null>(null);

  // Extract unique token addresses from will data
  const tokenAddresses = useMemo(() => {
    if (!willData) return [];
    const tokens = willData.estates.map((b) => b.token);
    return [...new Set(tokens)]; // Remove duplicates
  }, [willData]);

  const handleWillCreated = (data: WillData) => {
    setWillData(data);
    setCurrentStep(2); // Go to Approve Permit2 step
  };

  const handlePermit2Approved = () => {
    setCurrentStep(3); // Go to Encrypt step
  };

  const handleEncrypted = (data: EncryptedData) => {
    setEncryptedData(data);
    setCurrentStep(4);
  };

  const handleUploaded = (uploadedCid: string) => {
    setCid(uploadedCid);
    setCurrentStep(5);
  };

  const handleSubmitted = () => {
    alert('Will successfully created and submitted!');
    // Reset to step 1
    setCurrentStep(1);
    setWillData(null);
    setEncryptedData(null);
    setCid(null);
  };

  const resetProcess = () => {
    setCurrentStep(1);
    setWillData(null);
    setEncryptedData(null);
    setCid(null);
  };

  if (!isConnected) {
    return (
      <div className="testator-page">
        <div className="connect-prompt">
          <h2>Connect Wallet</h2>
          <p>Please connect your wallet to create a will</p>
        </div>
      </div>
    );
  }

  return (
    <div className="testator-page">
      <div className="page-header">
        <h1>Testator Dashboard</h1>
        <p>Create and upload your encrypted will to the blockchain</p>
      </div>

      <div className="steps-indicator">
        <div className={`step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
          <div className="step-number">1</div>
          <div className="step-label">Create Will</div>
        </div>
        <div className={`step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
          <div className="step-number">2</div>
          <div className="step-label">Approve Permit2</div>
        </div>
        <div className={`step ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}>
          <div className="step-number">3</div>
          <div className="step-label">Encrypt</div>
        </div>
        <div className={`step ${currentStep >= 4 ? 'active' : ''} ${currentStep > 4 ? 'completed' : ''}`}>
          <div className="step-number">4</div>
          <div className="step-label">Upload IPFS</div>
        </div>
        <div className={`step ${currentStep >= 5 ? 'active' : ''} ${currentStep > 5 ? 'completed' : ''}`}>
          <div className="step-number">5</div>
          <div className="step-label">Submit CID</div>
        </div>
      </div>

      <div className="step-content">
        {currentStep >= 1 && (
          <div className={`step-section ${currentStep > 1 ? 'completed' : 'active'}`}>
            <h3 className="step-section-title">Step 1: Create Will</h3>
            {currentStep === 1 ? (
              <CreateWillForm testatorAddress={address!} onSubmit={handleWillCreated} />
            ) : (
              <div className="step-completed-summary">
                <p>✓ Will created with {willData?.estates.length} estate(s)</p>
              </div>
            )}
          </div>
        )}
        {currentStep >= 2 && willData && (
          <div className={`step-section ${currentStep > 2 ? 'completed' : 'active'}`}>
            <h3 className="step-section-title">Step 2: Approve Permit2</h3>
            {currentStep === 2 ? (
              <ApprovePermit2Step
                tokenAddresses={tokenAddresses}
                onApproved={handlePermit2Approved}
              />
            ) : (
              <div className="step-completed-summary">
                <p>✓ Tokens approved for Permit2</p>
              </div>
            )}
          </div>
        )}
        {currentStep >= 3 && willData && (
          <div className={`step-section ${currentStep > 3 ? 'completed' : 'active'}`}>
            <h3 className="step-section-title">Step 3: Sign & Encrypt</h3>
            {currentStep === 3 ? (
              <EncryptStep willData={willData} onEncrypted={handleEncrypted} />
            ) : (
              <div className="step-completed-summary">
                <p>✓ Will signed and encrypted</p>
              </div>
            )}
          </div>
        )}
        {currentStep >= 4 && encryptedData && (
          <div className={`step-section ${currentStep > 4 ? 'completed' : 'active'}`}>
            <h3 className="step-section-title">Step 4: Upload to IPFS</h3>
            {currentStep === 4 ? (
              <UploadIPFSStep encryptedData={encryptedData} onUploaded={handleUploaded} />
            ) : (
              <div className="step-completed-summary">
                <p>✓ Uploaded to IPFS (CID: {cid?.slice(0, 20)}...)</p>
              </div>
            )}
          </div>
        )}
        {currentStep >= 5 && cid && encryptedData && (
          <div className={`step-section ${currentStep > 5 ? 'completed' : 'active'}`}>
            <h3 className="step-section-title">Step 5: Submit CID</h3>
            <SubmitCIDStep cid={cid} encryptedData={encryptedData} onSubmitted={handleSubmitted} />
          </div>
        )}
      </div>

      {currentStep > 1 && (
        <div className="actions">
          <button onClick={resetProcess} className="btn-secondary">
            Start Over
          </button>
        </div>
      )}
    </div>
  );
};

export default TestatorPage;
