import { PATHS_CONFIG } from "@config";
import type { SignedWill, SerializedWill } from "@shared/types/index.js";
import { WILL_TYPE } from "@shared/constants/index.js";
import { readWill, saveWill, serializeWill } from "@shared/utils/index.js";
import chalk from "chalk";

interface ProcessResult extends SerializedWill {
  serializedWillPath: string;
}

/**
 * Process will serialization workflow
 */
async function processWillSerialization(): Promise<ProcessResult> {
  try {
    const signedWill: SignedWill = readWill(WILL_TYPE.SIGNED);

    console.log(chalk.blue("Serializing signed will..."));

    const serializedWill: SerializedWill = serializeWill(signedWill);

    console.log(chalk.green("✅ Serialized successfully"));

    saveWill(WILL_TYPE.SERIALIZED, serializedWill);

    console.log(
      chalk.green.bold(
        "\n🎉 Will serialization process completed successfully!",
      ),
    );

    return {
      ...serializedWill,
      serializedWillPath: PATHS_CONFIG.will.serialized,
    };
  } catch (error) {
    console.error(
      chalk.red("Error during will serializing process:"),
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
    console.log(chalk.bgCyan("\n=== Signed Will Serialization ===\n"));

    const result = await processWillSerialization();

    console.log(chalk.green.bold("\n✅ Process completed successfully!"));
    console.log(chalk.gray("Results:"), result);
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

export { processWillSerialization };
