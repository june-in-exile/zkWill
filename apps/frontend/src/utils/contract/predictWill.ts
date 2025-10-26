/**
 * Predict Will contract address using CREATE2
 */

import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '@/config/contracts';

// Note: generateSalt is now provided by backend API via utils/api/client.ts

/**
 * Predict Will contract address using CREATE2
 * This allows us to know the Will address before deployment
 */
export const predictWillAddress = async (
  salt: bigint,
  testatorAddress: string,
  provider: ethers.BrowserProvider
): Promise<string> => {
  const willFactory = new ethers.Contract(
    CONTRACT_ADDRESSES.WILL_FACTORY,
    [
      'function getWillAddress(bytes32 salt, address testator) public view returns (address)',
    ],
    provider
  );

  const willAddress = await willFactory.getWillAddress(
    ethers.toBeHex(salt, 32),
    testatorAddress
  );

  return willAddress;
};
