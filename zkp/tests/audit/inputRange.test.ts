import { Byte, Byte16, Word } from "../type/index.js";
import { WitnessTester, wordToByte } from "../util/index.js";
import { ctrDecrypt } from "../logic/index.js";

/**
 * Audit PoC (NEGATED findings): out-of-range bytes cannot enter the decryption
 * path even though {byte} tags generate no constraints.
 *
 * - ciphertext[i] feeds BitwiseXor(2, 8), whose Num2Bits(8) range-checks it.
 * - iv is counters[0], which feeds the first AddRoundKey's Num2Bits(8); later
 *   counters come out of IncrementCounterOptimized as Bits2Num(8) bytes.
 * - key words feed AddRoundKey / XorWord, again through Num2Bits(8).
 * Values >= p are not representable in the R1CS; the Groth16 verifier's
 * checkField rejects public signals >= r before pairing.
 *
 * Each forged witness shifts one byte by 256 (borrowing from its neighbour when
 * that keeps the 32-bit counter value unchanged) and must be rejected.
 */

const key = [
  { bytes: [0x60, 0x3d, 0xeb, 0x10] },
  { bytes: [0x15, 0xca, 0x71, 0xbe] },
  { bytes: [0x2b, 0x73, 0xae, 0xf0] },
  { bytes: [0x85, 0x7d, 0x77, 0x81] },
  { bytes: [0x1f, 0x35, 0x2c, 0x07] },
  { bytes: [0x3b, 0x61, 0x08, 0xd7] },
  { bytes: [0x2d, 0x98, 0x10, 0xa3] },
  { bytes: [0x09, 0x14, 0xdf, 0xf4] },
] as Word[];
const iv = [
  0xf0, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa, 0xfb,
  0xfc, 0xfd, 0xfe, 0xff,
] as Byte16;
const plaintext = Array.from({ length: 32 }, (_, i) => (i * 37) & 0xff) as Byte[];
const ciphertext = ctrDecrypt(plaintext, key, iv);

describe("Audit: public input byte range in CtrDecrypt", function () {
  let circuit: WitnessTester<["ciphertext", "key", "iv"], ["plaintext"]>;

  beforeAll(async function (): Promise<void> {
    circuit = await WitnessTester.construct(
      "circuits/shared/components/aesGcm/ctrDecrypt.circom",
      "CtrDecrypt",
      { templateParams: ["256", "32"] },
    );
  }, 300_000);

  afterAll(async function (): Promise<void> {
    if (circuit) {
      await circuit.release();
    }
  });

  async function forge(overrides: Record<string, bigint>): Promise<bigint[]> {
    const witness = await circuit.calculateWitness({ ciphertext, key: wordToByte(key), iv });
    const present = await circuit.readSymbols(witness, Object.keys(overrides));
    expect(Object.values(present).every((value) => value !== undefined)).toBe(true);
    return circuit.editWitness(witness, overrides);
  }

  it("accepts the honest witness", async function (): Promise<void> {
    await circuit.expectConstraintPass(await forge({}));
  });

  it("rejects ciphertext[0] + 256", async function (): Promise<void> {
    await circuit.expectConstraintFail(
      await forge({ "main.ciphertext[0]": BigInt(ciphertext[0]) + 256n }),
    );
  });

  it("rejects iv[0] + 256", async function (): Promise<void> {
    await circuit.expectConstraintFail(await forge({ "main.iv[0]": BigInt(iv[0]) + 256n }));
  });

  it("rejects iv[15] + 256 with iv[14] - 1 (same 32-bit counter value)", async function (): Promise<void> {
    await circuit.expectConstraintFail(
      await forge({
        "main.iv[14]": BigInt(iv[14]) - 1n,
        "main.iv[15]": BigInt(iv[15]) + 256n,
      }),
    );
  });

  it("rejects a private key byte + 256", async function (): Promise<void> {
    await circuit.expectConstraintFail(
      await forge({ "main.key[7].bytes[3]": BigInt(key[7].bytes[3]) + 256n }),
    );
  });
});

describe("Audit: SBoxOptimized non-canonical hi/lo split", function () {
  let circuit: WitnessTester<["in"], ["out"]>;
  const component = "main.sboxoptimizedComponent";

  beforeAll(async function (): Promise<void> {
    circuit = await WitnessTester.construct(
      "circuits/shared/components/aesGcm/encryptBlock.circom",
      "SBoxOptimized",
    );
  });

  afterAll(async function (): Promise<void> {
    if (circuit) {
      await circuit.release();
    }
  });

  it("rejects 0x53 split as hi = 4, lo = 19 (lo outside Decoder(16))", async function (): Promise<void> {
    // 0x53 = 16 * 5 + 3 = 16 * 4 + 19; lo = 19 zeroes every loDecoder output,
    // so loDecoder.success === 1 cannot hold
    const witness = await circuit.calculateWitness({ in: 0x53 });
    const overrides = {
      [`${component}.hi`]: 4n,
      [`${component}.lo`]: 19n,
      [`${component}.hiDecoder.out[5]`]: 0n,
      [`${component}.hiDecoder.out[4]`]: 1n,
      [`${component}.loDecoder.out[3]`]: 0n,
    };
    const present = await circuit.readSymbols(witness, Object.keys(overrides));
    const kept = Object.fromEntries(
      Object.entries(overrides).filter(([name]) => present[name] !== undefined),
    );
    expect(Object.keys(kept)).toContain(`${component}.hiDecoder.out[4]`);

    await circuit.expectConstraintFail(await circuit.editWitness(witness, kept));
  });
});
