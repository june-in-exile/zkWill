import React from 'react';
import { useWallet } from '@hooks/useWallet';
import './WalletConnect.css';

const WalletConnect: React.FC = () => {
  const { address, chainId, isConnecting, error, isConnected, connect, disconnect } = useWallet();

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getNetworkName = (id: number | null) => {
    if (!id) return '';
    const networks: Record<number, string> = {
      1: 'Ethereum',
      31337: 'Anvil Local',
      421614: 'Arbitrum Sepolia',
    };
    return networks[id] || `Chain ${id}`;
  };

  return (
    <div className="wallet-connect">
      {isConnected ? (
        <div className="wallet-info">
          <div className="wallet-details">
            <span className="wallet-address">{formatAddress(address!)}</span>
            <span className="wallet-network">{getNetworkName(chainId)}</span>
          </div>
          <button onClick={disconnect} className="btn-disconnect">
            Disconnect
          </button>
        </div>
      ) : (
        <button onClick={connect} disabled={isConnecting} className="btn-connect">
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}
      {error && <div className="wallet-error">{error}</div>}
    </div>
  );
};

export default WalletConnect;
