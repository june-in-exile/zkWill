type EthereumAddress = `0x${string}`;
interface Estate {
  beneficiary: string;
  token: string;
  amount: bigint;
}

interface EstateToken {
  address: string;
  estates: number[];
  totalAmount: bigint;
}

interface WillContractInfo {
  testator: string;
  executor: string;
  estates: Estate[];
}

interface TokenBalance {
  address: string;
  tokenAddress: string;
  balance: bigint;
  formattedBalance: string;
  symbol: string;
  decimals: number;
}

interface BalanceSnapshot {
  timestamp: number;
  balances: TokenBalance[];
}

interface PermittedToken {
  token: string;
  amount: bigint;
}

interface Permit2Data {
  permitted: PermittedToken[];
  spender: string;
  nonce: bigint;
  deadline: number;
}


interface Permit2Signature {
  nonce: bigint;
  deadline: number;
  signature: string;
}

export type {
  EthereumAddress,
  Estate,
  EstateToken,
  WillContractInfo,
  TokenBalance,
  BalanceSnapshot,
  PermittedToken,
  Permit2Data,
  Permit2Signature,
};
