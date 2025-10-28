import { PATHS_CONFIG, PERMIT2_CONFIG, NETWORK_CONFIG } from "@config";
import type {
  Permit2Data,
  PermittedToken,
  Estate,
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
import { generateNonce } from "@shared/utils/cryptography/index.js";
import { signPermit2 } from "@shared/utils/cryptography/signature.js";
import { createSigner } from "@shared/utils/blockchain.js";
import preview from "@shared/utils/transform/preview.js";
import { JsonRpcProvider, Wallet } from "ethers";
import { createRequire } from "module";
import chalk from "chalk";

const require = createRequire(import.meta.url);

// Load Permit2 SDK for getting default PERMIT2 address
const permit2SDK = require("@uniswap/permit2-sdk");

// Using Permit2Data from shared utils
// Keep local alias for backward compatibility
type Permit = Permit2Data;

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

  // Handle default PERMIT2 address from SDK if not provided
  if (!result.data.PERMIT2) {
    result.data.PERMIT2 = permit2SDK.PERMIT2;
  }

  return result.data;
}

/**
 * Calculate deadline timestamp
 */
function calculatePermitDeadline(
  durationMs: number = PERMIT2_CONFIG.defaultDuration,
): number {
  console.log(chalk.blue("Calculating deadline..."));

  const endTimeMs = Date.now() + durationMs;
  const endTimeSeconds = Math.floor(endTimeMs / 1000);

  console.log(
    chalk.gray("Signature valid until:"),
    new Date(endTimeSeconds * 1000).toISOString(),
  );
  return endTimeSeconds;
}

/**
 * Create permit structure for signing
 */
function createPermitStructure(
  estates: Estate[],
  willAddress: string,
  nonce: bigint,
  deadline: number,
): Permit {
  try {
    console.log(chalk.blue("Creating permit structure..."));

    const permitted: PermittedToken[] = estates.map((estate) => {
      return {
        token: estate.token,
        amount: estate.amount,
      };
    });

    const permit: Permit = {
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

/**
 * Print detailed Permit information
 */
function printPermit(permit: Permit): void {
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
 * Sign permit using EIP-712
 * Now uses the shared signPermit2 function from @shared/utils/cryptography/signature.js
 */
async function signPermit2Local(
  permit: Permit,
  permit2Address: string,
  chainId: bigint,
  signer: Wallet,
): Promise<string> {
  try {
    console.log(chalk.blue("Generating EIP-712 signature..."));

    // Use the shared signPermit2 function to ensure consistency
    const signature = await signPermit2(permit, permit2Address, chainId, signer);

    console.log(chalk.green("✅ Signature generated successfully"));

    return signature;
  } catch (error) {
    throw new Error(
      `Failed to sign permit: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Process will signing workflow
 */
async function processPermitSigning(): Promise<ProcessResult> {
  try {
    const { TESTATOR_PRIVATE_KEY, PERMIT2 } = validateEnvironmentVariables();

    const provider = new JsonRpcProvider(NETWORK_CONFIG.rpc.current);
    const network = await validateNetwork(provider);

    const signer = await createSigner(TESTATOR_PRIVATE_KEY, provider);

    const willData: AddressedWill = readWill(WILL_TYPE.ADDRESSED);

    console.log(chalk.blue("Generating signature parameters..."));
    const nonce = generateNonce();
    const deadline = calculatePermitDeadline();

    const permit = createPermitStructure(
      willData.estates,
      willData.will,
      nonce,
      deadline,
    );

    printPermit(permit);

    const signature = await signPermit2Local(
      permit,
      PERMIT2,
      network.chainId,
      signer,
    );

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
