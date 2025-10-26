import { useState, useEffect, useCallback } from 'react';
import { BrowserProvider, JsonRpcSigner } from 'ethers';
import { NETWORK_CONFIG } from '@/config/contracts';

interface WalletState {
  address: string | null;
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  chainId: number | null;
  isConnecting: boolean;
  error: string | null;
  isCorrectNetwork: boolean;
}

const EXPECTED_CHAIN_ID = NETWORK_CONFIG.CHAIN_ID;

export const useWallet = () => {
  const [state, setState] = useState<WalletState>({
    address: null,
    provider: null,
    signer: null,
    chainId: null,
    isConnecting: false,
    error: null,
    isCorrectNetwork: false,
  });

  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      if (!window.ethereum) {
        throw new Error('Please install MetaMask or another Web3 wallet');
      }

      // Request accounts using window.ethereum.request
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      // If on wrong network, automatically try to switch
      if (chainId !== EXPECTED_CHAIN_ID) {
        console.log(`Wrong network detected (${chainId}), attempting to switch to ${EXPECTED_CHAIN_ID}...`);

        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${EXPECTED_CHAIN_ID.toString(16)}` }],
          });

          // After switching, get updated network info
          const updatedNetwork = await provider.getNetwork();
          const updatedChainId = Number(updatedNetwork.chainId);

          setState({
            address: accounts[0],
            provider,
            signer,
            chainId: updatedChainId,
            isConnecting: false,
            error: null,
            isCorrectNetwork: updatedChainId === EXPECTED_CHAIN_ID,
          });
          return;
        } catch (switchError: any) {
          // If chain doesn't exist, try to add it
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: `0x${EXPECTED_CHAIN_ID.toString(16)}`,
                    chainName: NETWORK_CONFIG.NETWORK_NAME,
                    nativeCurrency: {
                      name: NETWORK_CONFIG.CURRENCY_SYMBOL,
                      symbol: NETWORK_CONFIG.CURRENCY_SYMBOL,
                      decimals: 18,
                    },
                    rpcUrls: [NETWORK_CONFIG.RPC_URL],
                    blockExplorerUrls: [NETWORK_CONFIG.BLOCK_EXPLORER],
                  },
                ],
              });

              // After adding, the network should be switched automatically
              // Reload the page to refresh state
              window.location.reload();
              return;
            } catch (addError) {
              console.error('Failed to add network:', addError);
            }
          }

          // If auto-switch failed, user can switch manually later
          console.warn('Auto-switch failed, user will need to switch manually');
        }
      }

      setState({
        address: accounts[0],
        provider,
        signer,
        chainId,
        isConnecting: false,
        error: null,
        isCorrectNetwork: chainId === EXPECTED_CHAIN_ID,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Failed to connect wallet',
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({
      address: null,
      provider: null,
      signer: null,
      chainId: null,
      isConnecting: false,
      error: null,
    });
  }, []);

  // Check if already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (!window.ethereum) return;

      try {
        const accounts = await window.ethereum.request({
          method: 'eth_accounts',
        });

        if (accounts.length > 0) {
          const provider = new BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const network = await provider.getNetwork();
          const chainId = Number(network.chainId);

          // If wrong network on auto-connect, just set state (don't auto-switch silently)
          // User will see the network warning and can switch manually
          setState({
            address: accounts[0],
            provider,
            signer,
            chainId,
            isConnecting: false,
            error: null,
            isCorrectNetwork: chainId === EXPECTED_CHAIN_ID,
          });

          // Log warning if wrong network
          if (chainId !== EXPECTED_CHAIN_ID) {
            console.warn(
              `⚠️ Connected to wrong network (chainId: ${chainId}). Expected: ${EXPECTED_CHAIN_ID} (Arbitrum Sepolia)`
            );
          }
        }
      } catch (error) {
        console.error('Failed to check connection:', error);
      }
    };

    checkConnection();
  }, []);

  // Handle account changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else if (accounts[0] !== state.address) {
        setState((prev) => ({ ...prev, address: accounts[0] }));
      }
    };

    const handleChainChanged = (chainId: string) => {
      const newChainId = parseInt(chainId, 16);
      setState((prev) => ({
        ...prev,
        chainId: newChainId,
        isCorrectNetwork: newChainId === EXPECTED_CHAIN_ID
      }));
      // Reload page when network changes to reset state
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [state.address, disconnect]);

  const switchNetwork = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed');
    }

    try {
      // Try to switch to the network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${EXPECTED_CHAIN_ID.toString(16)}` }],
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        // Add the network
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: `0x${EXPECTED_CHAIN_ID.toString(16)}`,
              chainName: NETWORK_CONFIG.NETWORK_NAME,
              nativeCurrency: {
                name: NETWORK_CONFIG.CURRENCY_SYMBOL,
                symbol: NETWORK_CONFIG.CURRENCY_SYMBOL,
                decimals: 18,
              },
              rpcUrls: [NETWORK_CONFIG.RPC_URL],
              blockExplorerUrls: [NETWORK_CONFIG.BLOCK_EXPLORER],
            },
          ],
        });
      } else {
        throw switchError;
      }
    }
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    switchNetwork,
    isConnected: !!state.address,
    expectedChainId: EXPECTED_CHAIN_ID,
  };
};
