import { PATHS_CONFIG, NETWORK_CONFIG } from "@config";
import type {
  Permit2Data,
  PermitSigning,
  AddressedWill,
  SignedWill,
} from "@shared/types/index.js";
import { WILL_TYPE } from "@shared/constants/index.js";
import {
  validateEnvironment,
  presetValidations,
  validateNetwork,
} from "@shared/utils/validation/index.js";
import {
  updateEnvironmentVariables,
  readWill,
  saveWill,
} from "@shared/utils/file/index.js";
import { generateNonce, calculateDeadline, signPermit2 } from "@shared/utils/cryptography/index.js";
import { createSigner, createPermitStructure } from "@shared/utils/blockchain.js";
import preview from "@shared/utils/transform/preview.js";
import { JsonRpcProvider } from "ethers";
import chalk from "chalk";

interface ProcessResult {
  nonce: bigint;
  deadline: number;
  signature: string;
  signerAddress: string;
  signedWillPath: string;
}

/**
 * Validate environment variables
 */
function validateEnvironmentVariables(): PermitSigning {
  const result = validateEnvironment<PermitSigning>(
    presetValidations.permitSigning(),
  );

  if (!result.isValid) {
    throw new Error(
      `Environment validation failed: ${result.errors.join(", ")}`,
    );
  }
  return result.data;
}

/**
 * Print detailed Permit information
 */
function printPermit(permit: Permit2Data): void {
  console.log(chalk.cyan("\n=== Permit Details ===\n"));

  permit.permitted.forEach((estate, index) => {
    console.log(chalk.gray(`Estate ${index}:`), {
      token: estate.token,
      amount: estate.amount,
    });
  });
  console.log(chalk.gray("Spender (Will):"), permit.spender);
  console.log(chalk.gray("- Nonce:"), permit.nonce);
  console.log(
    chalk.gray(
      `- Deadline: ${permit.deadline} (${new Date(permit.deadline * 1000).toISOString()})`,
    ),
  );

  console.log(chalk.cyan("\n=== End of Permit Details ===\n"));
}

/**
 * Process will signing workflow
 */
async function processPermitSigning(): Promise<ProcessResult> {
  try {
    const { TESTATOR_PRIVATE_KEY } = validateEnvironmentVariables();

    const provider = new JsonRpcProvider(NETWORK_CONFIG.rpc.current);
    const network = await validateNetwork(provider);

    const signer = await createSigner(TESTATOR_PRIVATE_KEY, provider);

    const willData: AddressedWill = readWill(WILL_TYPE.ADDRESSED);

    console.log(chalk.blue("Generating signature parameters..."));
    const nonce = generateNonce();
    const deadline = calculateDeadline();

    const permit = createPermitStructure(
      willData.estates,
      willData.will,
      nonce,
      deadline,
    );

    printPermit(permit);

    const signature = await signPermit2(permit, signer, network.chainId);

    const signedWillData: SignedWill = {
      ...willData,
      permit2: {
        nonce,
        deadline,
        signature,
      },
    };

    saveWill(WILL_TYPE.SIGNED, signedWillData);

    await updateEnvironmentVariables([
      ["NONCE", nonce.toString()],
      ["DEADLINE", deadline.toString()],
      ["PERMIT2_SIGNATURE", signature],
    ]);

    console.log(
      chalk.green.bold("\n🎉 Will signing process completed successfully!"),
    );

    return {
      nonce,
      deadline,
      signature,
      signerAddress: await signer.getAddress(),
      signedWillPath: PATHS_CONFIG.will.signed,
    };
  } catch (error) {
    console.error(
      chalk.red("Error during will signing process:"),
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
    console.log(chalk.bgCyan("\n=== Permit2 Signature Generation ===\n"));

    const result = await processPermitSigning();

    console.log(chalk.green.bold("\n✅ Process completed successfully!"));
    console.log(chalk.gray("Results:"), {
      ...result,
      deadline: `${preview.timestamp(result.deadline * 1000)}`,
      signature: `${preview.longString(result.signature)}`,
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
export { signPermit2, processPermitSigning };
