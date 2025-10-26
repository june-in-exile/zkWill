/**
 * Approve Permit2 Step
 * Allows testator to approve ERC20 tokens for Permit2 contract
 */

import React, { useState, useEffect } from 'react';
import { useWallet } from '@hooks/useWallet';
import {
  checkApproval,
  approvePermit2,
  batchCheckApprovals,
  type ApprovalStatus,
} from '@utils/permit2/approve';
import './ApprovePermit2Step.css';

interface Props {
  tokenAddresses: string[];
  onApproved: () => void;
}

const ApprovePermit2Step: React.FC<Props> = ({ tokenAddresses, onApproved }) => {
  const { signer, provider, address, isCorrectNetwork, chainId, expectedChainId, switchNetwork } = useWallet();
  const [approvalStatuses, setApprovalStatuses] = useState<ApprovalStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingToken, setApprovingToken] = useState<string | null>(null);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);

  // Debug: log network state
  React.useEffect(() => {
    console.log('🔍 ApprovePermit2Step - Network State:', {
      chainId,
      expectedChainId,
      isCorrectNetwork,
      provider: !!provider,
      address,
    });
  }, [chainId, expectedChainId, isCorrectNetwork, provider, address]);

  // Check approval status on mount
  useEffect(() => {
    const checkStatuses = async () => {
      if (!provider || !address || tokenAddresses.length === 0) return;

      setIsChecking(true);
      setError(null);

      try {
        const statuses = await batchCheckApprovals(tokenAddresses, address, provider);
        setApprovalStatuses(statuses);
      } catch (err) {
        console.error('Failed to check approvals:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to check approvals';
        setError(errorMessage);

        // Log detailed error info for debugging
        console.error('Token addresses that failed:', tokenAddresses);
        console.error('Connected network:', await provider.getNetwork());
      } finally {
        setIsChecking(false);
      }
    };

    checkStatuses();
  }, [provider, address, tokenAddresses]);

  const handleApprove = async (tokenAddress: string) => {
    if (!signer) return;

    setIsLoading(true);
    setApprovingToken(tokenAddress);
    setError(null);

    try {
      await approvePermit2(tokenAddress, signer);

      // Refresh approval status
      if (provider && address) {
        const status = await checkApproval(tokenAddress, address, provider);
        setApprovalStatuses((prev) =>
          prev.map((s) => (s.token === tokenAddress ? status : s))
        );
      }
    } catch (err) {
      console.error('Approval failed:', err);
      setError(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setIsLoading(false);
      setApprovingToken(null);
    }
  };

  const handleApproveAll = async () => {
    if (!signer || !provider || !address) return;

    setIsLoading(true);
    setError(null);

    try {
      const tokensToApprove = approvalStatuses
        .filter((s) => !s.isApproved)
        .map((s) => s.token);

      for (const tokenAddress of tokensToApprove) {
        setApprovingToken(tokenAddress);
        await approvePermit2(tokenAddress, signer);

        // Refresh approval status
        const status = await checkApproval(tokenAddress, address, provider);
        setApprovalStatuses((prev) =>
          prev.map((s) => (s.token === tokenAddress ? status : s))
        );
      }
    } catch (err) {
      console.error('Batch approval failed:', err);
      setError(err instanceof Error ? err.message : 'Batch approval failed');
    } finally {
      setIsLoading(false);
      setApprovingToken(null);
    }
  };

  const handleSwitchNetwork = async () => {
    setIsSwitchingNetwork(true);
    setError(null);
    try {
      await switchNetwork();
      // Page will reload after network switch
    } catch (err) {
      console.error('Failed to switch network:', err);
      setError(err instanceof Error ? err.message : 'Failed to switch network');
      setIsSwitchingNetwork(false);
    }
  };

  const allApproved = approvalStatuses.length > 0 && approvalStatuses.every((s) => s.isApproved);

  if (isChecking) {
    return (
      <div className="approve-permit2-step">
        <h2>Checking Approval Status...</h2>
        <div className="loading">
          <div className="spinner"></div>
          <p>Checking token approvals for Permit2</p>
        </div>
      </div>
    );
  }

  // Show network warning if on wrong network
  if (!isCorrectNetwork) {
    return (
      <div className="approve-permit2-step">
        <h2>Wrong Network</h2>

        <div className="error">
          <strong>⚠️ Network Mismatch</strong>
          <p>
            You are currently connected to chain ID: <code>{chainId}</code>
          </p>
          <p>
            Expected chain ID: <code>{expectedChainId}</code> (Arbitrum Sepolia)
          </p>
        </div>

        <div className="info-box">
          <p><strong>Please switch your network:</strong></p>
          <ol>
            <li>Click the button below to automatically switch networks, OR</li>
            <li>Manually switch to Arbitrum Sepolia in your MetaMask wallet</li>
          </ol>
        </div>

        <button
          onClick={handleSwitchNetwork}
          disabled={isSwitchingNetwork}
          className="btn-primary"
          style={{ marginTop: '1rem' }}
        >
          {isSwitchingNetwork ? 'Switching Network...' : 'Switch to Arbitrum Sepolia'}
        </button>
      </div>
    );
  }

  return (
    <div className="approve-permit2-step">
      <h2>Approve Tokens for Permit2</h2>

      <div className="info-box">
        <p>
          <strong>Why is this needed?</strong>
        </p>
        <p>
          You need to approve the Permit2 contract to transfer your tokens on your behalf.
          This is a one-time setup per token. After approval, you can create signatures
          without additional blockchain transactions.
        </p>
      </div>

      {error && (
        <div className="error">
          <strong>Error:</strong> {error}
          <details style={{ marginTop: '1rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
              Need help? Click for troubleshooting steps
            </summary>
            <div style={{ marginTop: '0.5rem', fontSize: '0.9em' }}>
              <p><strong>Common solutions:</strong></p>
              <ol>
                <li>
                  <strong>Deploy test tokens:</strong> If testing locally, deploy MockERC20 tokens:
                  <pre style={{ background: '#2a2a2a', padding: '0.5rem', borderRadius: '4px', overflow: 'auto' }}>
                    cd contracts{'\n'}
                    forge script script/MockERC20.s.sol --rpc-url http://localhost:8545 --broadcast
                  </pre>
                </li>
                <li>
                  <strong>Check network:</strong> Make sure your wallet is connected to the correct network (chainId: {provider && 'checking...'})
                </li>
                <li>
                  <strong>Verify token address:</strong> Ensure the token addresses in your will are valid ERC20 contracts
                </li>
              </ol>
            </div>
          </details>
        </div>
      )}

      <div className="token-approvals">
        {approvalStatuses.map((status) => (
          <div key={status.token} className="approval-item">
            <div className="token-info">
              <div className="token-symbol">{status.symbol}</div>
              <div className="token-address">{status.token}</div>
              {status.isApproved && (
                <div className="approval-status approved">
                  ✓ Approved (Allowance: {status.currentAllowance.toString()})
                </div>
              )}
              {!status.isApproved && (
                <div className="approval-status not-approved">⚠ Not Approved</div>
              )}
            </div>
            {!status.isApproved && (
              <button
                onClick={() => handleApprove(status.token)}
                disabled={isLoading}
                className="btn-approve"
              >
                {approvingToken === status.token ? 'Approving...' : 'Approve'}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="actions">
        {!allApproved && (
          <button
            onClick={handleApproveAll}
            disabled={isLoading}
            className="btn-primary"
          >
            {isLoading ? 'Approving...' : 'Approve All Tokens'}
          </button>
        )}

        {allApproved && (
          <button onClick={onApproved} className="btn-primary">
            Continue to Create Will
          </button>
        )}
      </div>
    </div>
  );
};

export default ApprovePermit2Step;
