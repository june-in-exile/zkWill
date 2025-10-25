import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

const HomePage: React.FC = () => {
  return (
    <div className="home-page">
      <div className="hero">
        <h1>Web3 Will System</h1>
        <p className="subtitle">
          A blockchain-based inheritance management framework leveraging ZKP, IPFS, and smart contracts
        </p>
      </div>

      <div className="roles-grid">
        <div className="role-card">
          <h2>Testator</h2>
          <p>Create, encrypt, and upload your will to IPFS with zero-knowledge proof verification</p>
          <ul>
            <li>Create and format will</li>
            <li>Generate Permit2 signature</li>
            <li>Encrypt with AES-256</li>
            <li>Upload to IPFS</li>
            <li>Submit CID with ZKP</li>
          </ul>
          <Link to="/testator" className="role-link">
            Go to Testator Dashboard →
          </Link>
        </div>

        <div className="role-card">
          <h2>Notary</h2>
          <p>Verify and notarize the uploaded will to establish legal validity</p>
          <ul>
            <li>Review uploaded CIDs</li>
            <li>Verify will authenticity</li>
            <li>Notarize on-chain</li>
          </ul>
          <Link to="/notary" className="role-link">
            Go to Notary Dashboard →
          </Link>
        </div>

        <div className="role-card">
          <h2>Oracle</h2>
          <p>Authorize will execution after confirming testator's death</p>
          <ul>
            <li>Verify death confirmation</li>
            <li>Probate notarized CID</li>
            <li>Authorize executor</li>
          </ul>
          <Link to="/oracle" className="role-link">
            Go to Oracle Dashboard →
          </Link>
        </div>

        <div className="role-card">
          <h2>Executor</h2>
          <p>Create will contract and execute asset transfers to beneficiaries</p>
          <ul>
            <li>Download from IPFS</li>
            <li>Decrypt will</li>
            <li>Generate ZKP</li>
            <li>Create Will contract</li>
            <li>Transfer assets</li>
          </ul>
          <Link to="/executor" className="role-link">
            Go to Executor Dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
