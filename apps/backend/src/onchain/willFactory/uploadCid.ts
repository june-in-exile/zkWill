import { PATHS_CONFIG, NETWORK_CONFIG } from "@config";
import {
  WillFactory,
  WillFactory__factory,
  JsonCidVerifier,
} from "@shared/types/typechain-types/index.js";
import type {
  CidUploadProofData,
  EncryptedWill,
  UploadCid,
} from "@shared/types/index.js";
import { WILL_TYPE } from "@shared/constants/index.js";
import {
  validateFiles,
  validateEnvironment,
  presetValidations,
  validateNetwork,
} from "@shared/utils/validation/index.js";
import {
  updateEnvironmentVariables,
  readProof,
  readWill,
} from "@shared/utils/file/index.js";
import { createWallet, createContract } from "@shared/utils/blockchain.js";
import { encryptedWillToTypedJsonObject } from "@shared/utils/transform/blockchain.js";
import { printEncryptedWillJson, printProof } from "@shared/utils/print.js";
import preview from "@shared/utils/transform/preview.js";
import { JsonRpcProvider } from "ethers";
import chalk from "chalk";

interface UploadCidData {
  proof: CidUploadProofData;
  will: JsonCidVerifier.TypedJsonObject;
  cid: string;
  witnesses: string[];
}

interface ProcessResult {
  transactionHash: string;
  timestamp: number;
  gasUsed: bigint;
}

/**
 * Validate environment variables
 */
function validateEnvironmentVariables(): UploadCid {
  const result = validateEnvironment<UploadCid>(presetValidations.uploadCid());

  if (!result.isValid) {
    throw new Error(
      `Environment validation failed: ${result.errors.join(", ")}`,
    );
  }

  return result.data;
}

/**
 * Print detailed UploadCIDData information
 */
function printUploadCidData(uploadData: UploadCidData): void {
  console.log(chalk.cyan("\n=== UploadCIDData Details ==="));

  console.log(chalk.blue("\n📋 CID Information:"));
  console.log(chalk.gray("- CID:"), chalk.white(uploadData.cid));

  console.log(chalk.blue("\n👥 Witnesses:"));
  uploadData.witnesses.forEach((witness, index) => {
    console.log(chalk.gray(`- Witness ${index + 1}:`), chalk.white(witness));
  });

  printEncryptedWillJson(uploadData.will);

  printProof(uploadData.proof);

  console.log(chalk.cyan("\n=== End of UploadCidData Details ===\n"));
}

/**
 * Execute uploadCid transaction
 */
async function executeUploadCid(
  contract: WillFactory,
  uploadData: UploadCidData,
): Promise<ProcessResult> {
  try {
    console.log(chalk.blue("Executing uploadCid transaction..."));

    printUploadCidData(uploadData);

    const tx = await contract.uploadCid(
      uploadData.proof.pA,
      uploadData.proof.pB,
      uploadData.proof.pC,
      uploadData.proof.pubSignals,
      uploadData.will,
      uploadData.cid,
      uploadData.witnesses,
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
      `Failed to execute uploadCid: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Process CID upload workflow
 */
async function processUploadCid(): Promise<ProcessResult> {
  try {
    validateFiles([
      PATHS_CONFIG.zkp.cidUpload.verifier,
      PATHS_CONFIG.zkp.cidUpload.proof,
      PATHS_CONFIG.zkp.cidUpload.public,
    ]);
    const { WILL_FACTORY, TESTATOR_PRIVATE_KEY, CID, WITNESS1, WITNESS2 } =
      validateEnvironmentVariables();

    const provider = new JsonRpcProvider(NETWORK_CONFIG.rpc.current);
    await validateNetwork(provider);

    const wallet = createWallet(TESTATOR_PRIVATE_KEY, provider);

    const contract = await createContract<WillFactory>(
      WILL_FACTORY,
      WillFactory__factory,
      wallet,
    );

    const proof = readProof("cidUpload") as CidUploadProofData;
    const willData: EncryptedWill = readWill(WILL_TYPE.ENCRYPTED);
    const will: JsonCidVerifier.TypedJsonObject =
      encryptedWillToTypedJsonObject(willData);

    const result = await executeUploadCid(contract, {
      proof,
      will,
      cid: CID,
      witnesses: [WITNESS1, WITNESS2],
    });

    await updateEnvironmentVariables([
      ["UPLOAD_TX_HASH", result.transactionHash],
      ["UPLOAD_TIMESTAMP", result.timestamp.toString()],
    ]);

    console.log(
      chalk.green.bold("\n🎉 CID upload process completed successfully!"),
    );

    return result;
  } catch (error) {
    console.error(
      chalk.red("Error during CID upload process:"),
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
    console.log(chalk.bgCyan("\n=== Upload CID ===\n"));

    const result = await processUploadCid();

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

export { executeUploadCid, processUploadCid };
