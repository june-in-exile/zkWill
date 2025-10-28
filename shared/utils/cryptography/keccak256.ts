import { HASH_CONFIG } from "@config";
import type { HashableInput, HashArgs } from "@shared/types/index.js";
import { ethers } from "ethers";
import chalk from "chalk";

/**
 * Validate input message
 */
function validateInput(input: HashableInput): string {
  // Check for null/undefined
  if (input === null || input === undefined) {
    throw new Error("Input cannot be null or undefined");
  }

  // Convert to string if not already
  let message: string;
  if (typeof input === "string") {
    message = input;
  } else if (typeof input === "number" || typeof input === "boolean") {
    message = String(input);
  } else if (typeof input === "object") {
    try {
      message = JSON.stringify(input);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Cannot serialize object to string: ${errorMessage}`);
    }
  } else {
    throw new Error(`Unsupported input type: ${typeof input}`);
  }

  // Check size limits
  const sizeInBytes = Buffer.byteLength(message, "utf8");
  if (sizeInBytes > HASH_CONFIG.maxInputSize) {
    throw new Error(
      `Input too large: ${sizeInBytes} bytes (max: ${HASH_CONFIG.maxInputSize} bytes)`,
    );
  }

  return message;
}

/**
 * Validate UTF-8 encoding
 */
function validateEncoding(message: string, encoding: string = "utf8"): Buffer {
  try {
    if (!HASH_CONFIG.supportedEncodings.includes(encoding.toLowerCase())) {
      throw new Error(
        `Unsupported encoding: ${encoding}. Supported: ${HASH_CONFIG.supportedEncodings.join(", ")}`,
      );
    }

    // Test encoding/decoding cycle for validation
    const buffer = Buffer.from(message, encoding as BufferEncoding);
    const decoded = buffer.toString(encoding as BufferEncoding);

    // For UTF-8, check if decode matches original (detect invalid sequences)
    if (encoding.toLowerCase().includes("utf") && decoded !== message) {
      console.warn(
        chalk.yellow(
          "⚠️ Warning: UTF-8 encoding/decoding cycle mismatch detected",
        ),
      );
    }

    return buffer;
  } catch (error) {
    throw new Error(
      `Encoding validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Keccak256 hash function
 */
function keccak256(input: HashableInput, encoding: string = "utf8"): string {
  try {
    // Validate and normalize input
    const message = validateInput(input);

    // Validate encoding and convert to bytes
    const messageBuffer = validateEncoding(message, encoding);

    // Convert buffer to Uint8Array for ethers
    const messageBytes = new Uint8Array(messageBuffer);

    // Perform hashing
    let hash: string;
    try {
      hash = ethers.keccak256(messageBytes);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Keccak256 hashing failed: ${errorMessage}`);
    }

    return hash;
  } catch (error) {
    throw new Error(
      `Keccak256 hash generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Parse command line arguments to extract hash parameters
 * Supports --input and --encoding flags
 * @returns Object containing hash parameters
 * @throws Error if invalid arguments or missing required parameters
 */
function parseArgs(): HashArgs {
  const args = process.argv.slice(2);
  const parsed: Partial<HashArgs> = {
    encoding: "utf8", // Default encoding
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--input" && i + 1 < args.length) {
      parsed.input = args[i + 1];
    } else if (args[i] === "--encoding" && i + 1 < args.length) {
      const encoding = args[i + 1];
      if (!HASH_CONFIG.supportedEncodings.includes(encoding.toLowerCase())) {
        throw new Error(
          `Unsupported encoding: ${encoding}. Supported encodings: ${HASH_CONFIG.supportedEncodings.join(", ")}`,
        );
      }
      parsed.encoding = encoding;
      console.log(chalk.blue("Using encoding:"), encoding);
    }
  }

  // Validate required parameters
  if (!parsed.input) {
    throw new Error("Missing required parameter: --input must be specified");
  }

  return parsed as HashArgs;
}

/**
 * Display usage information for the script
 */
function showUsage(): void {
  console.log(chalk.cyan("\n=== Usage Information ===\n"));
  console.log(
    chalk.white(
      "This script generates Keccak256 hash of the provided input:\n",
    ),
  );

  console.log(chalk.yellow("Basic usage:"));
  console.log(
    chalk.gray('   pnpm exec tsx keccak256.ts --input "Hello, World!"'),
  );

  console.log(chalk.yellow("\nWith specific encoding:"));
  console.log(
    chalk.gray(
      '   pnpm exec tsx keccak256.ts --input "Hello, World!" --encoding utf8',
    ),
  );

  console.log(chalk.white("\nParameters:"));
  console.log(
    chalk.cyan("  --input") +
      chalk.gray("       Input text to hash [required]"),
  );
  console.log(
    chalk.cyan("  --encoding") +
      chalk.gray(
        "    Text encoding (utf8 | ascii | base64 | hex) [default: utf8]",
      ),
  );

  console.log(chalk.red("\nImportant:"));
  console.log(chalk.red("• --input parameter is required"));
  console.log(
    chalk.red(`• Maximum input size: ${HASH_CONFIG.maxInputSize} bytes`),
  );
}

/**
 * Main function that orchestrates the entire hashing process
 * 1. Parses command line arguments
 * 2. Performs Keccak256 hashing
 * 3. Displays formatted results
 *
 * @returns Promise that resolves when process completes successfully
 * @throws Error if any step in the process fails
 */
async function main(): Promise<void> {
  try {
    console.log(chalk.cyan("\n=== Keccak256 Hash Process ===\n"));

    // Parse command line arguments
    const { input, encoding } = parseArgs();

    // Perform hashing
    console.log(chalk.blue("Performing Keccak256 hash..."));
    const hash = keccak256(input, encoding);

    // Display results
    console.log(
      chalk.green.bold("\n✅ Keccak256 hash completed successfully!\n"),
    );

    console.log(chalk.cyan("Input:"), chalk.white(String(input)));
    console.log(chalk.cyan("Encoding:"), chalk.white(encoding || "utf8"));
    console.log(chalk.cyan("Keccak256 Hash:"), chalk.white(hash));
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      chalk.red.bold("\n❌ Keccak256 hash failed:"),
      error instanceof Error ? error.message : "Unknown error",
    );

    // Show usage information for argument-related errors
    if (
      errorMessage.includes("--input") ||
      errorMessage.includes("--encoding") ||
      errorMessage.includes("Missing required parameter") ||
      errorMessage.includes("Unsupported encoding")
    ) {
      showUsage();
    }

    // Log stack trace in development mode
    if (process.env.NODE_ENV === "development" && error instanceof Error) {
      console.error(chalk.gray("Stack trace:"), error.stack);
    }

    process.exit(1);
  }
}

// Check: is this file being executed directly or imported?
// Only run in Node.js environment
if (typeof process !== 'undefined' && process.argv && process.argv[1]) {
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
}

export { keccak256 };
