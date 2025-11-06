import { NETWORK_CONFIG } from "@config";
import { WillFactory, WillFactory__factory } from "@shared/types/typechain-types/index.js";
import type {
    ProbateWill,
} from "@shared/types/index.js";
import {
    updateEnvironmentVariables,
} from "@shared/utils/file/index.js";
import {
    validateNetwork,
    validateEnvironment,
    presetValidations,
} from "@shared/utils/validation/index.js";
import {
    createWallet,
    createContract,
} from "@shared/utils/blockchain.js";
import { ethers, JsonRpcProvider } from "ethers";
import preview from "@shared/utils/transform/preview.js";
import chalk from "chalk";

interface ProcessResult {
    transactionHash: string;
    timestamp: number;
    gasUsed: bigint;
}

/**
 * Validate environment variables
 */
function validateEnvironmentVariables(): ProbateWill {
    const result = validateEnvironment<ProbateWill>(
        presetValidations.probateCid(),
    );

    if (!result.isValid) {
        throw new Error(
            `Environment validation failed: ${result.errors.join(", ")}`,
        );
    }

    return result.data;
}


/**
 * Execute probateCid transaction
 */
async function executeProbation(
    contract: WillFactory,
    cid: string,
): Promise<ProcessResult> {
    try {
        console.log(
            chalk.blue("Executing probateCid transaction..."),
        );

        // Execute transaction
        const tx = await contract.probateCid(cid);

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

        // Check for CidProbated event
        const CidProbatedEvent = receipt.logs.find((log: ethers.Log) => {
            try {
                const parsed = contract.interface.parseLog(log);
                return parsed?.name === "CidProbated";
            } catch {
                return false;
            }
        });

        if (CidProbatedEvent) {
            console.log(chalk.green("🎉 CID probated successfully!"));
        } else {
            console.warn(
                chalk.yellow("⚠️  Warning: CidProbated event not found in logs"),
            );
        }

        return {
            transactionHash: receipt.hash,
            timestamp: Math.floor(Date.now() / 1000),
            gasUsed: receipt.gasUsed,
        };
    } catch (error) {
        throw new Error(
            `Failed to execute probateCid: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
    }
}

/**
 * Process probation workflow
 */
async function processProbation(): Promise<ProcessResult> {
    try {
        const { ORACLE_PRIVATE_KEY, WILL_FACTORY, CID } = validateEnvironmentVariables();

        const provider = new JsonRpcProvider(NETWORK_CONFIG.rpc.current);
        await validateNetwork(provider);

        const wallet = createWallet(ORACLE_PRIVATE_KEY, provider);

        const contract = await createContract<WillFactory>(
            WILL_FACTORY,
            WillFactory__factory,
            wallet,
        );

        const result = await executeProbation(
            contract,
            CID,
        );

        await updateEnvironmentVariables([
            ["PROBATE_TX_HASH", result.transactionHash],
            ["PROBATE_TIMESTAMP", result.timestamp.toString()],
        ]);

        console.log(
            chalk.green.bold("\n🎉 CID probation process completed successfully!"),
        );

        return result;
    } catch (error) {
        console.error(
            chalk.red("Error during probation process:"),
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
        console.log(chalk.bgCyan("\n=== Probation ===\n"));

        const result = await processProbation();

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

export { executeProbation, processProbation };
