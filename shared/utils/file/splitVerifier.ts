import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";

interface ICConstant {
  index: number;
  x: string;
  y: string;
}

interface VerifierData {
  basicConstants: string[];
  icConstants: ICConstant[];
  verifyFunction: string;
}

function parseVerifierContract(filePath: string): VerifierData {
  const content = fs.readFileSync(filePath, "utf-8");

  // Extract basic constants (r, q, alpha, beta, gamma, delta)
  const basicConstants: string[] = [];
  const seenConstants = new Set<string>();
  const basicConstantRegex =
    /uint256\s+constant\s+(r|q|alphax|alphay|betax1|betax2|betay1|betay2|gammax1|gammax2|gammay1|gammay2|deltax1|deltax2|deltay1|deltay2)\s*=\s*([^;]+);/g;

  let match;
  while ((match = basicConstantRegex.exec(content)) !== null) {
    const constantName = match[1];
    if (!seenConstants.has(constantName)) {
      seenConstants.add(constantName);
      basicConstants.push(match[0]);
    }
  }

  // Extract IC constants
  const icConstants: ICConstant[] = [];
  const icRegex = /uint256\s+constant\s+IC(\d+)(x|y)\s*=\s*([^;]+);/g;

  while ((match = icRegex.exec(content)) !== null) {
    const index = parseInt(match[1]);
    const coord = match[2];
    const value = match[3];

    let icConstant = icConstants.find((ic) => ic.index === index);
    if (!icConstant) {
      icConstant = { index, x: "", y: "" };
      icConstants.push(icConstant);
    }

    if (coord === "x") {
      icConstant.x = value;
    } else {
      icConstant.y = value;
    }
  }

  // Sort IC constants by index
  icConstants.sort((a, b) => a.index - b.index);

  // Extract the verifyProof function
  const verifyFunctionRegex = /function verifyProof\([^}]+\{[\s\S]*?\n\s*\}/;
  const verifyMatch = content.match(verifyFunctionRegex);
  const verifyFunction = verifyMatch ? verifyMatch[0] : "";

  return { basicConstants, icConstants, verifyFunction };
}

function generateConstantsContract(
  contractName: string,
  startIndex: number,
  endIndex: number,
  icConstants: ICConstant[],
): string {
  const relevantConstants = icConstants.slice(startIndex, endIndex);

  let constantDeclarations = "";
  let getICCases = "";

  relevantConstants.forEach((ic) => {
    constantDeclarations += `    uint256 constant IC${ic.index}x = ${ic.x};\n`;
    constantDeclarations += `    uint256 constant IC${ic.index}y = ${ic.y};\n`;

    getICCases += `        if (index == ${ic.index}) return (IC${ic.index}x, IC${ic.index}y);\n`;
  });

  const rangeStart =
    relevantConstants.length > 0 ? relevantConstants[0].index : startIndex;
  const rangeEnd =
    relevantConstants.length > 0
      ? relevantConstants[relevantConstants.length - 1].index + 1
      : endIndex;

  return `// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import { IVerifierConstants } from "../interfaces/IVerifierConstants.sol";

contract ${contractName} is IVerifierConstants {
${constantDeclarations}
    function _getICRange() internal pure returns (uint256 start, uint256 end) {
        return (${rangeStart}, ${rangeEnd});
    }

    function _getICCount() internal pure returns (uint256) {
        (uint256 start, uint256 end) = _getICRange();
        return end - start;
    }

    function getICCount() external pure returns (uint256) {
        return _getICCount();
    }

    function _getIC(uint256 index) internal pure returns (uint256 x, uint256 y) {
        (uint256 start, uint256 end) = _getICRange();
        if (index < start || index >= end) revert IndexOutOfRange(index);

${getICCases}
        revert InvalidIndex(index);
    }

    function getIC(uint256 index) external pure returns (uint256 x, uint256 y) {
        return _getIC(index);
    }

    function getBatchIC(uint256 startIdx, uint256 count)
        external pure returns (uint256[] memory xs, uint256[] memory ys) {
        (uint256 start, uint256 end) = _getICRange();
        if (startIdx < start || startIdx >= end) revert BatchStartOutOfRange(startIdx);
        if (startIdx + count > end) revert BatchEndOutOfRange(startIdx, count);
        
        xs = new uint256[](count);
        ys = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            (xs[i], ys[i]) = _getIC(startIdx + i);
        }
    }
}`;
}

function generateMainContract(
  contractName: string,
  basicConstants: string[],
  icConstants: ICConstant[],
  constantsContracts: string[],
): string {
  const basicConstantDeclarations = basicConstants.join("\n    ");
  const totalICCount = icConstants.length;
  const pubSignalsCount = totalICCount - 1;

  // Find IC0 values
  const ic0 = icConstants.find((ic) => ic.index === 0);
  const ic0Declaration = ic0
    ? `\n    // IC0 constant\n    uint256 constant IC0x = ${ic0.x};\n    uint256 constant IC0y = ${ic0.y};`
    : "";

  // Generate constants contract addresses and constructor params
  const constantsAddresses = constantsContracts
    .map(
      (_, index) =>
        `    IVerifierConstants public immutable constants${index + 1};`,
    )
    .join("\n");

  const constructorParams = constantsContracts
    .map((_, index) => `address _constants${index + 1}`)
    .join(", ");

  const constructorAssignments = constantsContracts
    .map(
      (_, index) =>
        `        constants${index + 1} = IVerifierConstants(_constants${index + 1});`,
    )
    .join("\n");

  return `// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import { IVerifierConstants } from "./interfaces/IVerifierConstants.sol";
import { EllipticCurveOps } from "./libs/EllipticCurveOps.sol";

contract ${contractName} is EllipticCurveOps, IVerifierConstants {
    // Verification Key data
    ${basicConstantDeclarations}${ic0Declaration}

${constantsAddresses}

    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;
    uint16 constant pLastMem = 896;

    constructor(${constructorParams}) {
${constructorAssignments}
    }

    function _getICCount() internal pure returns (uint256) {
        return ${totalICCount};
    }

    function getICCount() external pure returns (uint256) {
        return _getICCount();
    }

    function _getIC(uint256 index) internal view returns (uint256 x, uint256 y) {
        if (index == 0) {
            return (IC0x, IC0y);
        }${constantsContracts.length === 1
      ? ` else if (index < _getICCount()) {
            return constants1.getIC(index);
        }`
      : ` else if (index <= 150) {
            return constants1.getIC(index);
        } else if (index < _getICCount()) {
            return constants2.getIC(index);
        }`
    } else {
            revert IndexOutOfRange(index);
        }
    }

    function getIC(uint256 index) external view returns (uint256 x, uint256 y) {
        return _getIC(index);
    }

    function _getBatchIC(uint256 startIdx, uint256 count)
        internal
        view
        returns (uint256[] memory xs, uint256[] memory ys)
    {
        if (startIdx == 0 || startIdx >= _getICCount()) revert BatchStartOutOfRange(startIdx);
        if (startIdx + count > _getICCount()) revert BatchEndOutOfRange(startIdx, count);

        xs = new uint256[](count);
        ys = new uint256[](count);

        uint256 processed = 0;

        ${constantsContracts.length === 1
      ? `// Process constants1 range (1+)
        if (processed < count) {
            uint256 batchStart = startIdx;
            uint256 remaining = count - processed;

            (uint256[] memory batchXs, uint256[] memory batchYs) = constants1.getBatchIC(batchStart, remaining);

            for (uint256 i = 0; i < remaining; i++) {
                xs[processed + i] = batchXs[i];
                ys[processed + i] = batchYs[i];
            }
        }`
      : `// Process constants1 range (1-150)
        if (startIdx <= 150 && processed < count) {
            uint256 batchStart = startIdx;
            uint256 batchEnd = startIdx + count > 151 ? 151 : startIdx + count;
            uint256 batchCount = batchEnd - batchStart;

            (uint256[] memory batchXs, uint256[] memory batchYs) = constants1.getBatchIC(batchStart, batchCount);

            for (uint256 i = 0; i < batchCount; i++) {
                xs[processed + i] = batchXs[i];
                ys[processed + i] = batchYs[i];
            }
            processed += batchCount;
        }

        // Process constants2 range (151+)
        if (processed < count) {
            uint256 batchStart = startIdx + processed;
            uint256 remaining = count - processed;

            (uint256[] memory batchXs, uint256[] memory batchYs) = constants2.getBatchIC(batchStart, remaining);

            for (uint256 i = 0; i < remaining; i++) {
                xs[processed + i] = batchXs[i];
                ys[processed + i] = batchYs[i];
            }
        }`
    }
    }

    function getBatchIC(uint256 startIdx, uint256 count)
        external
        view
        returns (uint256[] memory xs, uint256[] memory ys)
    {
        return _getBatchIC(startIdx, count);
    }

    function computeLinearCombination(uint256[${pubSignalsCount}] calldata pubSignals) internal view returns (uint256 x, uint256 y) {
        // Get IC0 as starting point
        (x, y) = _getIC(0);
        if (!isOnCurve(x, y)) revert ICNotOnCurve(x, y);

        // Adjust batch size based on gas limits
        uint256 batchSize = 50;
        uint256 ICCount = _getICCount();

        for (uint256 start = 1; start < ICCount; start += batchSize) {
            uint256 end = start + batchSize > ICCount ? ICCount : start + batchSize;
            uint256 count = end - start;

            // Get batch of IC constants
            (uint256[] memory icxs, uint256[] memory icys) = _getBatchIC(start, count);

            // Process each IC in the batch
            for (uint256 i = 0; i < count; i++) {
                uint256 signalIndex = start + i - 1; // -1 because pubSignals is 0-indexed but IC starts from 1
                if (signalIndex < ${pubSignalsCount} && pubSignals[signalIndex] != 0) {
                    // Scalar multiplication
                    (uint256 mulX, uint256 mulY) = ecMul(icxs[i], icys[i], pubSignals[signalIndex]);

                    // Point addition
                    (x, y) = ecAdd(x, y, mulX, mulY);
                }
            }
        }
    }

    function verifyProof(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[${pubSignalsCount}] calldata _pubSignals
    ) public view returns (bool) {
        (uint256 vk_x, uint256 vk_y) = computeLinearCombination(_pubSignals);
        assembly {
            function checkField(v) {
                if iszero(lt(v, r)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function checkPairing(pA, pB, pC, pubSignals, pMem, vkX, vkY) -> isOk {
                let _pPairing := add(pMem, pPairing)
                let _pVk := add(pMem, pVk)

                // -A
                mstore(_pPairing, calldataload(pA))
                mstore(add(_pPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

                // B
                mstore(add(_pPairing, 64), calldataload(pB))
                mstore(add(_pPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pPairing, 160), calldataload(add(pB, 96)))

                // alpha1
                mstore(add(_pPairing, 192), alphax)
                mstore(add(_pPairing, 224), alphay)

                // beta2
                mstore(add(_pPairing, 256), betax1)
                mstore(add(_pPairing, 288), betax2)
                mstore(add(_pPairing, 320), betay1)
                mstore(add(_pPairing, 352), betay2)

                // vk_x
                mstore(add(_pPairing, 384), vkX)
                mstore(add(_pPairing, 416), vkY)

                // gamma2
                mstore(add(_pPairing, 448), gammax1)
                mstore(add(_pPairing, 480), gammax2)
                mstore(add(_pPairing, 512), gammay1)
                mstore(add(_pPairing, 544), gammay2)

                // C
                mstore(add(_pPairing, 576), calldataload(pC))
                mstore(add(_pPairing, 608), calldataload(add(pC, 32)))

                // delta2
                mstore(add(_pPairing, 640), deltax1)
                mstore(add(_pPairing, 672), deltax2)
                mstore(add(_pPairing, 704), deltay1)
                mstore(add(_pPairing, 736), deltay2)

                let success := staticcall(sub(gas(), 2000), 8, _pPairing, 768, _pPairing, 0x20)

                isOk := and(success, mload(_pPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            // Validate that all evaluations ∈ F
            for { let i := 0 } lt(i, ${pubSignalsCount}) { i := add(i, 1) } { checkField(calldataload(add(_pubSignals, mul(i, 32)))) }

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem, vk_x, vk_y)

            mstore(0, isValid)
            return(0, 0x20)
        }
    }
}`;
}

function generateCombinedContract(
  contractName: string,
  basicConstants: string[],
  icConstants: ICConstant[],
  constantsContracts: { name: string; content: string }[],
): string {
  const mainContract = generateMainContract(
    contractName,
    basicConstants,
    icConstants,
    constantsContracts.map((c) => c.name),
  );

  // Extract the contract content without SPDX and pragma
  const constantsContractContents = constantsContracts
    .map((contract) => {
      const lines = contract.content.split("\n");
      const contractStartIndex = lines.findIndex((line) =>
        line.startsWith("contract "),
      );
      return lines.slice(contractStartIndex).join("\n");
    })
    .join("\n\n");

  return `${mainContract}

${constantsContractContents}
`;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.error("Usage: node split-verifier.js <verifier-file-path>");
    process.exit(1);
  }

  const inputFile = args[0];
  if (!fs.existsSync(inputFile)) {
    console.error(`File not found: ${inputFile}`);
    process.exit(1);
  }

  const baseName = path.basename(inputFile, ".sol");

  console.log(chalk.blue(`\nSplitting verifier contract: ${inputFile} ...`));

  try {
    const verifierData = parseVerifierContract(inputFile);

    if (verifierData.icConstants.length === 0) {
      console.error("No IC constants found in the contract");
      process.exit(1);
    }

    console.log(`Found ${verifierData.icConstants.length} IC constants`);

    // Determine how many constants contracts we need and their names
    const contracts: { name: string; content: string }[] = [];

    // For small verifiers like Multiplier2Verifier (2 IC constants), only need one constants contract
    if (verifierData.icConstants.length <= 100) {
      contracts.push({
        name: `${baseName}Constants1`,
        content: generateConstantsContract(
          `${baseName}Constants1`,
          1,
          verifierData.icConstants.length,
          verifierData.icConstants,
        ),
      });
    } else {
      // For larger verifiers, split into multiple contracts
      contracts.push({
        name: `${baseName}Constants1`,
        content: generateConstantsContract(
          `${baseName}Constants1`,
          1,
          151,
          verifierData.icConstants,
        ),
      });
      contracts.push({
        name: `${baseName}Constants2`,
        content: generateConstantsContract(
          `${baseName}Constants2`,
          151,
          verifierData.icConstants.length,
          verifierData.icConstants,
        ),
      });
    }

    // Generate combined contract with all contracts in one file
    const combinedContract = generateCombinedContract(
      baseName,
      verifierData.basicConstants,
      verifierData.icConstants,
      contracts,
    );

    // Write the combined contract back to the original file
    fs.writeFileSync(inputFile, combinedContract);

    console.log(chalk.green("✅ Successfully updated verifier contract:"));
    console.log(
      chalk.green(
        `  - ${baseName}.sol (main verifier with embedded constants contracts)`,
      ),
    );
    contracts.forEach((contract) => {
      console.log(chalk.green(`    - ${contract.name} (embedded)`));
    });
  } catch (error) {
    console.error("Error processing verifier contract:", error);
    process.exit(1);
  }
}

// Check: is this file being executed directly or imported?
if (import.meta.url === new URL(process.argv[1], "file:").href) {
  // Only run when executed directly
  main().catch((error: Error) => {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(chalk.red.bold("Uncaught error:"), errorMessage);
    process.exit(1);
  });
}
