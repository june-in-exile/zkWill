import React, { useState } from 'react';
import { useWallet } from '@hooks/useWallet';
import CreateWillForm from './components/CreateWillForm';
import EncryptStep from './components/EncryptStep';
import UploadIPFSStep from './components/UploadIPFSStep';
import SubmitCIDStep from './components/SubmitCIDStep';
import './TestatorPage.css';

export interface WillData {
  testator: string;
  executor: string;
  beneficiaries: Array<{
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

  const handleWillCreated = (data: WillData) => {
    setWillData(data);
    setCurrentStep(2);
  };

  const handleEncrypted = (data: EncryptedData) => {
    setEncryptedData(data);
    setCurrentStep(3);
  };

  const handleUploaded = (uploadedCid: string) => {
    setCid(uploadedCid);
    setCurrentStep(4);
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
          <div className="step-label">Encrypt</div>
        </div>
        <div className={`step ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}>
          <div className="step-number">3</div>
          <div className="step-label">Upload IPFS</div>
        </div>
        <div className={`step ${currentStep >= 4 ? 'active' : ''} ${currentStep > 4 ? 'completed' : ''}`}>
          <div className="step-number">4</div>
          <div className="step-label">Submit CID</div>
        </div>
      </div>

      <div className="step-content">
        {currentStep === 1 && (
          <CreateWillForm testatorAddress={address!} onSubmit={handleWillCreated} />
        )}
        {currentStep === 2 && willData && (
          <EncryptStep willData={willData} onEncrypted={handleEncrypted} />
        )}
        {currentStep === 3 && encryptedData && (
          <UploadIPFSStep encryptedData={encryptedData} onUploaded={handleUploaded} />
        )}
        {currentStep === 4 && cid && encryptedData && (
          <SubmitCIDStep cid={cid} encryptedData={encryptedData} onSubmitted={handleSubmitted} />
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
