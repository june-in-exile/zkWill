import { NETWORK_CONFIG } from "@config";
import type { WitnessSigning } from "@shared/types/index.js";
import {
  validateEnvironment,
  presetValidations,
} from "@shared/utils/validation/index.js";
import { updateEnvironmentVariables } from "@shared/utils/file/index.js";
import { createSigner } from "@shared/utils/blockchain.js";
import { signMessage } from "@shared/utils/cryptography/index.js";
import preview from "@shared/utils/transform/preview.js";
import { JsonRpcProvider } from "ethers";
import chalk from "chalk";

interface ProcessResult {
  witness1Signature: string;
  witness2Signature: string;
  witness1Address: string;
  witness2Address: string;
}

/**
 * Validate environment variables
 */
function validateEnvironmentVariables(): WitnessSigning {
  const result = validateEnvironment<WitnessSigning>(
    presetValidations.witnessSigning(),
  );

  if (!result.isValid) {
    throw new Error(
      `Environment validation failed: ${result.errors.join(", ")}`,
    );
  }
  return result.data;
}

/**
 * Process witness signing workflow
 */
async function processWitnessSigning(): Promise<ProcessResult> {
  try {
    const {
      WITNESS1_PRIVATE_KEY,
      WITNESS2_PRIVATE_KEY,
      CID,
    } = validateEnvironmentVariables();

    const provider = new JsonRpcProvider(NETWORK_CONFIG.rpc.current);

    const witness1 = await createSigner(WITNESS1_PRIVATE_KEY, provider);
    const witness2 = await createSigner(WITNESS2_PRIVATE_KEY, provider);

    console.log(chalk.blue("Generating witness signatures..."));

    const witness1Signature = await signMessage(CID, witness1);
    const witness2Signature = await signMessage(CID, witness2);

    await updateEnvironmentVariables([
      ["WITNESS1_SIGNATURE", witness1Signature],
      ["WITNESS2_SIGNATURE", witness2Signature],
    ]);

    console.log(
      chalk.green.bold(
        "\n🎉 Witness-signing process completed successfully!",
      ),
    );

    return {
      witness1Address: await witness1.getAddress(),
      witness2Address: await witness2.getAddress(),
      witness1Signature,
      witness2Signature,
    };
  } catch (error) {
    console.error(
      chalk.red("Error during witness-signing process:"),
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
    console.log(chalk.bgCyan("\n=== Witness Signature Generation ===\n"));

    const result = await processWitnessSigning();

    console.log(chalk.green.bold("\n✅ Process completed successfully!"));
    console.log(chalk.gray("Results:"), {
      witness1Address: result.witness1Address,
      witness2Address: result.witness2Address,
      witness1Signature: `${preview.longString(result.witness1Signature)}`,
      witness2Signature: `${preview.longString(result.witness2Signature)}`,
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

// Export the shared signPermit2 for external use
export { processWitnessSigning };
