import { PATHS_CONFIG, CRYPTO_CONFIG } from "@config";
import type {
  EncryptionArgs,
  SerializedWill,
  EncryptedWill,
} from "@shared/types/index.js";
import { WILL_TYPE } from "@shared/constants/will.js";
// import { generateKey } from "@shared/utils/cryptography/key.js";
// import { generateInitializationVector } from "@shared/utils/cryptography/initializationVector.js";
import { encrypt } from "@shared/utils/cryptography/encrypt.js";
import { readWill, saveWill } from "@shared/utils/file/index.js";
import preview from "@shared/utils/transform/preview.js";
import chalk from "chalk";

interface ProcessResult extends EncryptedWill {
  encryptedWillPath: string;
}

/**
 * Generate encryption keys and IV
 */
function getEncryptionArgs(): EncryptionArgs {
  const algorithm = CRYPTO_CONFIG.algorithm;

  const serializedWill: SerializedWill = readWill(WILL_TYPE.SERIALIZED);

  let hexString = serializedWill.hex;
  if (hexString.length % 2 === 1) {
    hexString += '0';
    console.log(chalk.yellow("Warning: Hex string had odd length, padded with '0'"));
  }

  const plaintext = Buffer.from(
    hexString,
    CRYPTO_CONFIG.plaintextEncoding,
  );
  // const key = generateKey();
  const key = Buffer.from("z6Nn/viwn4mwUW8KC2DCJycs8JyD2T7xkQKOFjMmidM=", 'base64');
  // const iv = generateInitializationVector();
  const iv = Buffer.from("DGon+2oDuOg5yCIjK5Cqyw==", 'base64');

  return { algorithm, plaintext, key, iv };
}

/**
 * Process will encryption
 */
async function processWillEncryption(): Promise<ProcessResult> {
  try {
    const { algorithm, plaintext: will, key, iv } = getEncryptionArgs();

    const result = encrypt(algorithm, will, key, iv);

    const encryptedWill: EncryptedWill = {
      algorithm: algorithm,
      iv: Array.from(iv),
      authTag:
        "authTag" in result
          ? Array.from(result.authTag)
          : Array.from(Buffer.alloc(0)),
      ciphertext: Array.from(result.ciphertext),
      timestamp: Math.floor(Date.now() / 1000),
    };

    saveWill(WILL_TYPE.ENCRYPTED, encryptedWill);

    console.log(
      chalk.green.bold("\n🎉 Will encryption process completed successfully!"),
    );

    return {
      ...encryptedWill,
      encryptedWillPath: PATHS_CONFIG.will.encrypted,
    };
  } catch (error) {
    console.error(
      chalk.red("Error during will encryption process:"),
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
    console.log(chalk.bgCyan("\n=== Will Encryption ===\n"));

    const result = await processWillEncryption();

    console.log(chalk.green.bold("\n✅ Process completed successfully!"));
    console.log(chalk.gray("Results:"), {
      ...result,
      ciphertext: `${preview.numbers(result.ciphertext)}`,
      timestamp: `${preview.timestamp(result.timestamp * 1000)}`,
    });
  } catch (error) {
    console.error(
      chalk.red.bold("❌ Program execution failed:"),
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

export { processWillEncryption };
