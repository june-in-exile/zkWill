import { ethers, Wallet, JsonRpcProvider, Contract, formatUnits } from "ethers";
import { ERC20_ABI } from "@shared/constants/blockchain.js";
import { Will } from "@shared/types/typechain-types/index.js";
import type {
  Estate,
  TokenBalance,
  WillContractInfo,
  Permit2Data,
  PermittedToken,
} from "@shared/types/blockchain.js";
import chalk from "chalk";

async function getTokenInfo(
  tokenAddress: string,
  signer: Wallet,
): Promise<{ name: string; symbol: string }> {
  try {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);

    const [name, symbol] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
    ]);

    return { name, symbol };
  } catch (error) {
    console.warn(
      chalk.yellow(
        `⚠️ Could not fetch token info for ${tokenAddress}:`,
        error instanceof Error ? error.message : "Unknown error",
      ),
    );
    return { name: "Unknown", symbol: "UNKNOWN" };
  }
}

async function getTokenBalance(
  provider: JsonRpcProvider,
  tokenAddress: string,
  holderAddress: string,
): Promise<TokenBalance> {
  try {
    const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);

    const [balance, symbol, decimals] = await Promise.all([
      tokenContract.balanceOf(holderAddress),
      tokenContract.symbol().catch(() => "UNKNOWN"),
      tokenContract.decimals().catch(() => 18),
    ]);

    const formattedBalance = formatUnits(balance, decimals);

    return {
      address: holderAddress,
      tokenAddress,
      balance,
      formattedBalance,
      symbol,
      decimals,
    };
  } catch (error) {
    throw new Error(
      `Failed to fetch token balance for ${tokenAddress}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

async function getTokenAllowance(
  tokenAddress: string,
  ownerAddress: string,
  spenderAddress: string,
  signer: Wallet,
): Promise<bigint> {
  try {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    const allowance = await tokenContract.allowance(
      ownerAddress,
      spenderAddress,
    );
    return allowance;
  } catch (error) {
    throw new Error(
      `Failed to fetch token allowance for ${tokenAddress}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

async function getWillInfo(contract: Will): Promise<WillContractInfo> {
  try {
    console.log(chalk.blue("Fetching will information..."));

    const [testator, executor, estates] = await Promise.all([
      contract.testator(),
      contract.executor(),
      contract.getAllEstates(),
    ]);

    const formattedEstates: Estate[] = estates.map((estate: Estate) => ({
      beneficiary: estate.beneficiary,
      token: estate.token,
      amount: estate.amount,
    }));

    console.log(chalk.green("✅ Will information retrieved"));

    return {
      testator,
      executor,
      estates: formattedEstates,
    };
  } catch (error) {
    throw new Error(
      `Failed to fetch will info: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

async function createSigner(
  privateKey: string,
  provider: JsonRpcProvider,
): Promise<Wallet> {
  try {
    console.log(chalk.blue("Initializing signer..."));
    const signer = new ethers.Wallet(privateKey, provider);

    const address = await signer.getAddress();
    const balance = await signer.provider!.getBalance(address);

    console.log(chalk.green("✅ Signer initialized:"), chalk.white(address));
    console.log(chalk.gray("Balance:"), ethers.formatEther(balance), "ETH");

    if (balance === 0n) {
      console.warn(
        chalk.yellow("⚠️ Warning: Signer has zero balance for gas fees"),
      );
    }

    return signer;
  } catch (error) {
    throw new Error(
      `Failed to create signer: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

function createWallet(privateKey: string, provider?: JsonRpcProvider): Wallet {
  try {
    console.log(chalk.blue("Creating wallet..."));
    const formattedKey = privateKey.startsWith("0x")
      ? privateKey
      : `0x${privateKey}`;
    const wallet = new Wallet(formattedKey, provider);
    console.log(chalk.green("✅ Wallet created:"), wallet.address);
    return wallet;
  } catch (error) {
    throw new Error(
      `Failed to create wallet: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

async function createContract<T extends Contract>(
  contractAddress: string,
  contractFactory: any,
  providerOrWallet: JsonRpcProvider | Wallet,
): Promise<T> {
  try {
    console.log(chalk.blue(`Loading contract at ${contractAddress}...`));

    const contract = contractFactory.connect(
      contractAddress,
      providerOrWallet,
    ) as T;

    // Validate contract exists at address
    const provider =
      providerOrWallet instanceof Wallet
        ? providerOrWallet.provider
        : providerOrWallet;

    if (!provider) {
      throw new Error("Provider is null");
    }

    const code = await provider.getCode(contractAddress);
    if (code === "0x") {
      throw new Error(`No contract found at address: ${contractAddress}`);
    }

    console.log(chalk.green("✅ Contract loaded successfully"));

    return contract;
  } catch (error) {
    throw new Error(
      `Failed to create contract: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Create permit structure for signing
 */
function createPermitStructure(
  estates: Estate[],
  willAddress: string,
  nonce: bigint,
  deadline: number,
): Permit2Data {
  try {
    console.log(chalk.blue("Creating permit structure..."));

    const permitted: PermittedToken[] = estates.map((estate) => {
      return {
        token: estate.token,
        amount: estate.amount,
      };
    });

    const permit: Permit2Data = {
      permitted,
      spender: willAddress,
      nonce,
      deadline,
    };

    console.log(chalk.green("✅ Permit structure created"));
    return permit;
  } catch (error) {
    throw new Error(
      `Failed to create permit structure: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export {
  getTokenInfo,
  getTokenBalance,
  getTokenAllowance,
  getWillInfo,
  createSigner,
  createWallet,
  createContract,
  createPermitStructure,
};
