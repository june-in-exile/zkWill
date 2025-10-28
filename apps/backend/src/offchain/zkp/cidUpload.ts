import type { Groth16Proof, EncryptedWill } from "@shared/types/index.js";
import { generateZkpProof } from "@shared/utils/cryptography/zkp.js";
import { WILL_TYPE } from "@shared/constants/index.js";
import { readWill } from "@shared/utils/index.js";
import { getKey } from "@shared/utils/cryptography/key.js";
import chalk from "chalk";

async function proveForCidUpload(): Promise<Groth16Proof> {
  const encryptedWill: EncryptedWill = readWill(WILL_TYPE.ENCRYPTED);
  const key = getKey();

  return generateZkpProof({
    circuitName: "cidUpload",
    input: {
      ciphertext: encryptedWill.ciphertext,
      key: Array.from(key),
      iv: encryptedWill.iv,
    },
  });
}

async function main(): Promise<void> {
  console.log(chalk.cyan(`\n=== Generating Proof for CID Upload ===\n`));

  await proveForCidUpload();

  console.log(chalk.green.bold("\n✅ Process completed successfully!"));
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  main().catch((error: Error) => {
    console.error(
      chalk.red.bold("Uncaught error:"),
      error instanceof Error ? error.message : "Unknown error",
    );
    process.exit(1);
  });
}

export { proveForCidUpload };
