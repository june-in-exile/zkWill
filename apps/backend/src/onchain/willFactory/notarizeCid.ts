import { NETWORK_CONFIG } from "@config";
import {
  WillFactory,
  WillFactory__factory,
} from "@shared/types/typechain-types/index.js";
import type { NotarizeCid } from "@shared/types/index.js";
import {
  validateEnvironment,
  presetValidations,
  validateNetwork,
} from "@shared/utils/validation/index.js";
import { updateEnvironmentVariables } from "@shared/utils/file/index.js";
import { createWallet, createContract } from "@shared/utils/blockchain.js";
import preview from "@shared/utils/transform/preview.js";
import { JsonRpcProvider } from "ethers";
import chalk from "chalk";

interface NotarizeCidData {
  cid: string;
  witnessSignatures: [string, string];
}

interface ProcessResult {
  transactionHash: string;
  timestamp: number;
  gasUsed: bigint;
}

/**
 * Validate environment variables
 */
function validateEnvironmentVariables(): NotarizeCid {
  const result = validateEnvironment<NotarizeCid>(
    presetValidations.notarizeCid(),
  );

  if (!result.isValid) {
    throw new Error(
      `Environment validation failed: ${result.errors.join(", ")}`,
    );
  }

  return result.data;
}

/**
 * Print notarization information
 */
function printNotarizationDetails(notarizeData: NotarizeCidData): void {
  console.log(chalk.cyan("\n=== Notarization Details ==="));

  console.log(chalk.blue("\n📋 CID Information:"));
  console.log(chalk.gray("- CID:"), chalk.white(notarizeData.cid));

  console.log(chalk.blue("\n✍️ Witness Signatures:"));
  console.log(
    chalk.gray("- Witness 1:"),
    chalk.white(preview.longString(notarizeData.witnessSignatures[0])),
  );
  console.log(
    chalk.gray("- Witness 2:"),
    chalk.white(preview.longString(notarizeData.witnessSignatures[1])),
  );

  console.log(chalk.cyan("\n=== End of Notarization Details ===\n"));
}

/**
 * Execute notarizeCid transaction
 */
async function executeNotarizeCID(
  contract: WillFactory,
  notarizeData: NotarizeCidData,
): Promise<ProcessResult> {
  try {
    console.log(chalk.blue("Executing notarizeCid transaction..."));

    printNotarizationDetails(notarizeData);

    const tx = await contract.notarizeCid(
      notarizeData.cid,
      notarizeData.witnessSignatures,
    );

    const receipt = await tx.wait();

    if (!receipt) {
      throw new Error("Transaction receipt is null");
    }

    if (receipt.status !== 1) {
      throw new Error(`Transaction failed with status: ${receipt.status}`);
    }

    console.log(chalk.green("✅ Transaction confirmed:"), receipt.hash);
    console.log(chalk.gray("Block number:"), receipt.blockNumber);
    console.log(chalk.gray("Gas used:"), receipt.gasUsed.toString());

    return {
      transactionHash: receipt.hash,
      timestamp: Math.floor(Date.now() / 1000),
      gasUsed: receipt.gasUsed,
    };
  } catch (error) {
    throw new Error(
      `Failed to execute notarizeCid: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Process CID notarization workflow
 */
async function processNotarizeCID(): Promise<ProcessResult> {
  try {
    const { WILL_FACTORY, NOTARY_PRIVATE_KEY, CID, WITNESS1_SIGNATURE, WITNESS2_SIGNATURE } =
      validateEnvironmentVariables();

    const provider = new JsonRpcProvider(NETWORK_CONFIG.rpc.current);
    await validateNetwork(provider);

    const wallet = createWallet(NOTARY_PRIVATE_KEY, provider);

    const contract = await createContract<WillFactory>(
      WILL_FACTORY,
      WillFactory__factory,
      wallet,
    );

    const result = await executeNotarizeCID(contract, {
      cid: CID,
      witnessSignatures: [WITNESS1_SIGNATURE, WITNESS2_SIGNATURE],
    });

    await updateEnvironmentVariables([
      ["NOTARIZE_TX_HASH", result.transactionHash],
      ["NOTARIZE_TIMESTAMP", result.timestamp.toString()],
    ]);

    console.log(
      chalk.green.bold("\n🎉 CID notarization process completed successfully!"),
    );

    return result;
  } catch (error) {
    console.error(
      chalk.red("Error during CID notarization process:"),
      error instanceof Error ? error.message : "Unknown error",
    );
    throw error;
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    console.log(chalk.bgCyan("\n=== Notarize CID ===\n"));

    const result = await processNotarizeCID();

    console.log(chalk.green.bold("\n✅ Process completed successfully!"));
    console.log(chalk.gray("Results:"), {
      ...result,
      timestamp: `${preview.timestamp(result.timestamp * 1000)}`,
    });
  } catch (error) {
    console.error(
      chalk.red.bold("\n❌ Program execution failed:"),
      error instanceof Error ? error.message : "Unknown error",
    );

    // Log stack trace in development mode
    if (process.env.NODE_ENV === "development" && error instanceof Error) {
      console.error(chalk.gray("Stack trace:"), error.stack);
    }

    process.exit(1);
  }
}

// Check: is this file being executed directly or imported?
if (import.meta.url === new URL(process.argv[1], "file:").href) {
  // Only run when executed directly
  main().catch((error) => {
    console.error(
      chalk.red.bold("Uncaught error:"),
      error instanceof Error ? error.message : "Unknown error",
    );
    process.exit(1);
  });
}

export { executeNotarizeCID, processNotarizeCID };
