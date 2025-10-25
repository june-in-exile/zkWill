import { PATHS_CONFIG } from "@config";
import type { IpfsDownload, DownloadedWill } from "@shared/types/index.js";
import {
  validateEnvironment,
  presetValidations,
} from "@shared/utils/validation/index.js";
import { WILL_TYPE } from "@shared/constants/will.js";
import { saveWill } from "@shared/utils/file/index.js";
import {
  createHeliaInstance,
  downloadFromIpfs,
  stopHelia,
} from "@shared/utils/ipfs.js";
import preview from "@shared/utils/transform/preview.js";
import { Helia } from "helia";
import chalk from "chalk";

interface ProcessResult extends DownloadedWill {
  downloadedWillPath: string;
}

/**
 * Validate environment variables
 */
function validateEnvironmentVariables(): IpfsDownload {
  const result = validateEnvironment<IpfsDownload>(
    presetValidations.ipfsDownload(),
  );

  if (!result.isValid) {
    throw new Error(
      `Environment validation failed: ${result.errors.join(", ")}`,
    );
  }

  return result.data;
}

/**
 * Download encrypted will from IPFS and save to local file
 */
async function processIPFSDownload(): Promise<ProcessResult> {
  let helia: Helia | undefined;

  try {
    const { CID } = validateEnvironmentVariables();

    const { helia: heliaInstance, jsonHandler } = await createHeliaInstance();
    helia = heliaInstance;

    const downloadedWill = (await downloadFromIpfs(
      jsonHandler,
      CID,
    )) as DownloadedWill;

    saveWill(WILL_TYPE.DOWNLOADED, downloadedWill);

    console.log(
      chalk.green.bold("\n🎉 IPFS download process completed successfully!"),
    );

    return {
      ...downloadedWill,
      downloadedWillPath: PATHS_CONFIG.will.downloaded,
    };
  } catch (error) {
    console.error(
      chalk.red("Failed to download from IPFS:"),
      error instanceof Error ? error.message : "Unknown error",
    );
    throw error;
  } finally {
    if (helia) stopHelia(helia);
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    console.log(chalk.bgCyan("\n=== IPFS Will Download ===\n"));

    const result = await processIPFSDownload();

    console.log(chalk.green.bold("\n✅ Process completed successfully!"));
    console.log(chalk.gray("Results:"), {
      ciphertext: `${preview.numbers(result.ciphertext)}`,
      timestamp: `${preview.timestamp(result.timestamp * 1000)}`,
      downloadedWillPath: result.downloadedWillPath,
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

export { processIPFSDownload };
