import React, { useState } from 'react';
import './IpfsExplorerPage.css';

interface EncryptedData {
  algorithm: string;
  iv: number[];
  authTag: number[];
  ciphertext: number[];
  timestamp: number;
}

const IpfsExplorerPage: React.FC = () => {
  const [cid, setCid] = useState('');
  const [encryptedData, setEncryptedData] = useState<EncryptedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = () => {
    setIsSearching(true);
    setError(null);
    setEncryptedData(null);

    try {
      const cacheKey = `ipfs_cache_${cid.trim()}`;
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        const data = JSON.parse(cached) as EncryptedData;
        setEncryptedData(data);
      } else {
        setError('Not Found');
      }
    } catch (err) {
      console.error('Error retrieving data:', err);
      setError('Error retrieving data');
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setCid('');
    setEncryptedData(null);
    setError(null);
  };

  return (
    <div className="ipfs-explorer-page">
      <div className="page-header">
        <h1>IPFS Explorer (Local Simulation)</h1>
        <p>Query encrypted data by CID from local storage</p>
      </div>

      <div className="search-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Enter CID (e.g., bafyreib...)"
            value={cid}
            onChange={(e) => setCid(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && cid.trim()) {
                handleSearch();
              }
            }}
            className="cid-input"
          />
          <div className="button-group">
            <button
              onClick={handleSearch}
              disabled={!cid.trim() || isSearching}
              className="btn-primary"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
            <button
              onClick={handleClear}
              className="btn-secondary"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="info-box">
          <p>
            This page simulates an IPFS explorer by querying locally cached data.
            Data is stored in browser localStorage after being uploaded from the Testator page.
          </p>
        </div>
      </div>

      {error && (
        <div className="error-result">
          <h3>Error</h3>
          <p>{error}</p>
        </div>
      )}

      {encryptedData && (
        <div className="data-result">
          <h3>Encrypted Data Found</h3>
          <div className="encrypted-data-display">
            <div className="data-field">
              <label>Algorithm:</label>
              <div className="data-value">{encryptedData.algorithm}</div>
            </div>

            <div className="data-field">
              <label>IV (Initialization Vector):</label>
              <div className="data-value array-value">
                [{encryptedData.iv.join(', ')}]
              </div>
            </div>

            <div className="data-field">
              <label>Auth Tag:</label>
              <div className="data-value array-value">
                [{encryptedData.authTag.join(', ')}]
              </div>
            </div>

            <div className="data-field">
              <label>Ciphertext:</label>
              <div className="data-value array-value">
                [{encryptedData.ciphertext.join(', ')}]
              </div>
            </div>

            <div className="data-field">
              <label>Timestamp:</label>
              <div className="data-value">
                {encryptedData.timestamp} ({new Date(encryptedData.timestamp * 1000).toLocaleString('en-US')})
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IpfsExplorerPage;
