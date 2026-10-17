import { Byte } from "../type/index.js";
import { WitnessTester, hexToByte } from "../util/index.js";

/**
 * Audit PoC (H3, CONFIRMED at the statement level, not an R1CS under-constraint):
 * the signed Permit2 spender (`will`) is never tied to the Will that createWill
 * deploys.
 *
 * - cidUpload signs over `will` but exposes only `testator`.
 * - willCreation discards `will` (`_` in Deserialize's output tuple) and exposes
 *   testator, executor, estates and salt, from which WillFactory derives the
 *   CREATE2 address.
 *
 * So two plaintexts that differ only in `will` give identical willCreation
 * public outputs; nothing on-chain can notice that the permit names another
 * spender, and Will.signatureTransferToBeneficiaries would then revert in Permit2.
 *
 * Severity Low–Medium (liveness), won't fix for now; this test records current
 * behaviour. See README.md for the options considered (B is the long-term fix).
 */

const serialized = hexToByte(
  "041F57c4492760aaE44ECed29b49a30DaAD3D4CcF85d255D10EbA7Ec5a12724D134420A3C2b8EA3a3fF1F826E1180d151200A4d5431a3Aa3142C4A8c75faf114eafb1BDbe2F0316DF893fd58CE46AA4d000000000000000000000000000003e83fF1F826E1180d151200A4d5431a3Aa3142C4A8cb1D4538B4571d411F07960EF2838Ce337FE1E80E000000000000000000000000004c4b40c5d2c214e0b80b2561c6d1de7cc6d4fe8e695b0cc5e14486c7874f60a84d6ac67f118dB12aC53D93a87efbaf18e08f4927599e1556fdf14ff8dea66a892c6c490e208f240000000124f17e66e8f8eb8a61fdf1aa50e8c7ba680b9b8ccaada8132cb13842a764dfd5e31a6b8737a5f3084f43936b9d528d1c86ad1d30352fa487a852882cbe5d7517505d9b6d1b",
) as Byte[];

// testator 20 + executor 20 + 2 estates * 56 + salt 32
const WILL_OFFSET = 20 + 20 + 2 * 56 + 32;
const WILL_LENGTH = 20;
const WILL_CREATION_OUTPUTS = ["testator", "executor", "estates", "salt"];

function withSpender(bytes: readonly Byte[], spender: readonly Byte[]): Byte[] {
  return bytes.map((byte, i) =>
    i >= WILL_OFFSET && i < WILL_OFFSET + WILL_LENGTH ? spender[i - WILL_OFFSET] : byte,
  ) as Byte[];
}

describe("Audit: signed spender vs deployed Will", function () {
  let circuit: WitnessTester<["serializedBytes"], ["testator", "executor", "estates", "salt", "will"]>;

  beforeAll(async function (): Promise<void> {
    circuit = await WitnessTester.construct(
      "circuits/shared/components/deserialization.circom",
      "Deserialize",
      { templateParams: ["293"] },
    );
  });

  afterAll(async function (): Promise<void> {
    if (circuit) {
      await circuit.release();
    }
  });

  it("H3: willCreation outputs are identical for plaintexts that sign different spenders", async function (): Promise<void> {
    const otherSpender = Array.from({ length: WILL_LENGTH }, () => 0xab) as Byte[];
    const original = await circuit.compute({ serializedBytes: serialized });
    const swapped = await circuit.compute({
      serializedBytes: withSpender(serialized, otherSpender),
    });

    // Bus outputs are flattened into symbols such as main.estates[0].amount
    const outputSymbols = Object.keys(original).filter((name) =>
      WILL_CREATION_OUTPUTS.some((output) => new RegExp(`^main\\.${output}[.[]?`).test(name)),
    );
    expect(outputSymbols.some((name) => name.startsWith("main.estates["))).toBe(true);

    expect(swapped["main.will"]).not.toBe(original["main.will"]);
    for (const name of outputSymbols) {
      expect(swapped[name]).toBe(original[name]);
    }
  });
});
