/**
 * Permit2 approval utilities
 * Handles ERC20 token approvals for Permit2 contract
 */

import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '@/config/contracts';

// Standard ERC20 ABI for approve function
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function allowance(address owner, address spender) public view returns (uint256)',
  'function symbol() public view returns (string)',
  'function decimals() public view returns (uint8)',
];

export interface ApprovalStatus {
  token: string;
  symbol: string;
  currentAllowance: bigint;
  isApproved: boolean;
}

/**
 * Validate if address has contract code deployed
 */
const isValidContract = async (
  address: string,
  provider: ethers.BrowserProvider
): Promise<boolean> => {
  try {
    const code = await provider.getCode(address);
    return code !== '0x';
  } catch (error) {
    return false;
  }
};

/**
 * Check if token is already approved for Permit2
 */
export const checkApproval = async (
  tokenAddress: string,
  ownerAddress: string,
  provider: ethers.BrowserProvider
): Promise<ApprovalStatus> => {
  // Validate token address format
  if (!ethers.isAddress(tokenAddress)) {
    throw new Error(`Invalid token address: ${tokenAddress}`);
  }

  // Check if contract exists at address
  const hasCode = await isValidContract(tokenAddress, provider);
  if (!hasCode) {
    throw new Error(
      `No contract found at ${tokenAddress}. Please verify:\n` +
      `1. The token address is correct\n` +
      `2. You are connected to the correct network\n` +
      `3. The token contract is deployed`
    );
  }

  const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

  try {
    const [allowance, symbol] = await Promise.all([
      tokenContract.allowance(ownerAddress, CONTRACT_ADDRESSES.PERMIT2),
      tokenContract.symbol().catch(() => 'UNKNOWN'),
    ]);

    const currentAllowance = BigInt(allowance.toString());
    // Consider approved if allowance > 0 (in production, you might want a higher threshold)
    const isApproved = currentAllowance > 0n;

    return {
      token: tokenAddress,
      symbol,
      currentAllowance,
      isApproved,
    };
  } catch (error: any) {
    // Provide more helpful error message
    if (error.code === 'BAD_DATA') {
      throw new Error(
        `Invalid ERC20 token at ${tokenAddress}. ` +
        `The contract does not implement the ERC20 standard (missing allowance/symbol methods).`
      );
    }
    throw error;
  }
};

/**
 * Approve Permit2 to spend tokens
 * Uses MaxUint256 for unlimited approval
 */
export const approvePermit2 = async (
  tokenAddress: string,
  signer: ethers.JsonRpcSigner
): Promise<ethers.TransactionReceipt> => {
  const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);

  console.log(`Approving Permit2 for token: ${tokenAddress}`);

  // Approve max amount
  const tx = await tokenContract.approve(
    CONTRACT_ADDRESSES.PERMIT2,
    ethers.MaxUint256
  );

  console.log(`Approval transaction sent: ${tx.hash}`);

  // Wait for confirmation
  const receipt = await tx.wait();

  console.log(`Approval confirmed in block: ${receipt?.blockNumber}`);

  return receipt;
};

/**
 * Check approval status for multiple tokens
 */
export const batchCheckApprovals = async (
  tokenAddresses: string[],
  ownerAddress: string,
  provider: ethers.BrowserProvider
): Promise<ApprovalStatus[]> => {
  const statusPromises = tokenAddresses.map((token) =>
    checkApproval(token, ownerAddress, provider)
  );

  return await Promise.all(statusPromises);
};
