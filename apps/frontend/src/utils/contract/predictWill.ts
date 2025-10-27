/**
 * Predict Will contract address using CREATE2
 */

import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '@/config/contracts';
import type { WillData } from '@/pages/testator/TestatorPage';

// Note: generateSalt is now provided by backend API via utils/api/client.ts

/**
 * Predict Will contract address using CREATE2
 * This allows us to know the Will address before deployment
 */
export const predictWillAddress = async (
  salt: bigint,
  willData: WillData,
  provider: ethers.BrowserProvider
): Promise<string> => {
  const willFactory = new ethers.Contract(
    CONTRACT_ADDRESSES.WILL_FACTORY,
    [
      'function predictWill(address _testator, address _executor, tuple(address beneficiary, address token, uint256 amount)[] estates, uint256 _salt) external view returns (address)',
    ],
    provider
  );

  // Format estates for contract call
  const estatesForContract = willData.estates.map((e) => ({
    beneficiary: e.address,
    token: e.token,
    amount: BigInt(e.amount),
  }));

  const willAddress = await willFactory.predictWill(
    willData.testator,
    willData.executor,
    estatesForContract,
    salt
  );

  return willAddress;
};
