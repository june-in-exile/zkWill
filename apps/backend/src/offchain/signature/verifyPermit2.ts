import { NETWORK_CONFIG } from "@config";
import { WILL_TYPE } from "@shared/constants/index.js";
import { readWill } from "@shared/utils/file/index.js";
import { ethers } from 'ethers';
import { createRequire } from 'module';
import type { SignedWill, Permit2Data, PermittedToken } from '@shared/types/index.js';
import chalk from "chalk";

const require = createRequire(import.meta.url);
const permit2SDK = require("@uniswap/permit2-sdk");

/**
 * Verify Permit2 signature and recover signer address
 *
 * @param signedWill - The signed will data containing permit2 signature
 * @param chainId - The chain ID to verify against
 * @returns The recovered signer address
 * @throws Error if signature is invalid
 */
async function verifyPermit2Signature(
  signedWill: SignedWill,
  chainId: bigint
): Promise<string> {
  try {
    const permitted: PermittedToken[] = signedWill.estates.map((estate) => ({
      token: estate.token,
      amount: estate.amount,
    }));

    const permit2Data: Permit2Data = {
      permitted,
      spender: signedWill.will,
      nonce: signedWill.permit2.nonce,
      deadline: signedWill.permit2.deadline,
    };

    // Get EIP-712 typed data from Permit2 SDK
    const { domain, types, values } = permit2SDK.SignatureTransfer.getPermitData(
      permit2Data,
      permit2SDK.PERMIT2_ADDRESS,
      chainId
    );

    // Recover the signer address from the signature
    const recoveredAddress = ethers.verifyTypedData(
      domain,
      types,
      values,
      signedWill.permit2.signature
    );

    return recoveredAddress;
  } catch (error) {
    throw new Error(
      `Permit2 signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Verify that the signature matches the testator address
 *
 * @param signedWill - The signed will data
 * @param chainId - The chain ID to verify against
 * @returns true if signature is valid and matches testator
 * @throws Error if signature is invalid or doesn't match testator
 */
async function verifyTestatorSignature(
  signedWill: SignedWill,
  chainId: bigint
): Promise<boolean> {
  try {
    // Recover signer address from signature
    const recoveredAddress = await verifyPermit2Signature(signedWill, chainId);

    // Normalize addresses for comparison (case-insensitive)
    const normalizedRecovered = recoveredAddress.toLowerCase();
    const normalizedTestator = signedWill.testator.toLowerCase();

    // Verify the recovered address matches the testator
    if (normalizedRecovered !== normalizedTestator) {
      throw new Error(
        `Signature verification failed: recovered address ${recoveredAddress} does not match testator ${signedWill.testator}`
      );
    }

    console.log(`✅ Signature verified: ${recoveredAddress} matches testator ${signedWill.testator}`);
    return true;
  } catch (error) {
    throw new Error(
      `Testator signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Process will signing workflow
 */
async function processPermitVerification() {
  try {
    const signedWill: SignedWill = readWill(WILL_TYPE.SIGNED);

    const chainId = BigInt(NETWORK_CONFIG.expectedChainIds[0]);

    await verifyTestatorSignature(signedWill, chainId);

    console.log(
      chalk.green.bold("\n🎉 Permit verification completed successfully!"),
    );
  } catch (error) {
    console.error(
      chalk.red("Error during permit verification process:"),
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
    console.log(chalk.bgCyan("\n=== Permit2 Signature Verification ===\n"));

    await processPermitVerification();

    console.log(chalk.green.bold("\n✅ Process completed successfully!"));

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

export { verifyPermit2Signature, verifyTestatorSignature };