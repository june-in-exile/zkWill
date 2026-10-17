import { keccak256, toUtf8Bytes } from "ethers";
import { CURVE } from "../logic/index.js";
import type { Bit } from "../type/index.js";
import { WitnessTester, flattenEcdsaSignature } from "../util/index.js";
import {
  craftWithOverflowingR,
  craftWithSmallS,
  digestToBits,
  ecrecover,
  samePoint,
  signDigest,
  toCircuitPubkey,
  toCircuitSignature,
  verificationPointParity,
} from "./util/signatures.js";
import type { CraftedSignature } from "./util/signatures.js";

/**
 * Audit PoC: RecoverEcdsaPubkey accepts signatures that ecrecover (and hence
 * Permit2's SignatureVerification) rejects or attributes to another signer.
 *
 * H1 (v not bound to R.y parity) is FIXED: its tests assert the flipped-v witness
 * is rejected and that genuine signatures of both parities still prove.
 * H2a/H2b are accepted as-is (won't fix): their tests document that the circuit
 * still ACCEPTS the gap case.
 *
 * None of these is a forgery: every case needs a signature that is valid under
 * the claimed pubkey, so only the key holder (the testator, who must also be
 * msg.sender of uploadCid) can produce one. The impact is that a cidUpload proof
 * can attest to a permit signature that will never execute.
 */

const DIGEST = 0x3bbbc719c9f5bb11b342bbe24efe817e51f8be9ff221c9c39db36a021b25698dn;
const PRIVATE_KEY = 0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdefn;
const bitsMsghash = digestToBits(DIGEST);
// Each RecoverEcdsaPubkey witness takes minutes (unconstrained recovery runs in wasm),
// so the circuit samples a few per parity and a TS property check covers many more
const COMPLETENESS_PER_PARITY = 3;
const MAX_COMPLETENESS_SAMPLES = 64;
const PARITY_PROPERTY_SAMPLES = 200;

type SampledSignature = { signature: CraftedSignature; digest: bigint; bitsMsghash: Bit[] };

function circuitInput(sig: CraftedSignature, msghashBits: Bit[] = bitsMsghash) {
  return {
    bitsMsghash: msghashBits,
    signature: flattenEcdsaSignature(toCircuitSignature(sig)),
  };
}

/** Deterministic pseudo-random key/digest pairs signed with ethers. */
function sampleSignatures(count: number): SampledSignature[] {
  return Array.from({ length: count }, (_, i) => {
    const privateKey = (BigInt(keccak256(toUtf8Bytes(`audit-key-${i}`))) % (CURVE.n - 1n)) + 1n;
    const digest = BigInt(keccak256(toUtf8Bytes(`audit-digest-${i}`)));
    return { signature: signDigest(privateKey, digest), digest, bitsMsghash: digestToBits(digest) };
  });
}

/** Take the first `perParity` samples of each v. */
function signaturesCoveringBothParities(perParity: number): SampledSignature[] {
  const samples = sampleSignatures(MAX_COMPLETENESS_SAMPLES);
  const picked = [27, 28].flatMap((v) =>
    samples.filter(({ signature }) => signature.v === v).slice(0, perParity),
  );
  expect(picked).toHaveLength(2 * perParity);
  return picked;
}

describe("Audit: ECDSA acceptance set vs ecrecover", { timeout: 600_000 }, function () {
  let circuit: WitnessTester<["bitsMsghash", "signature"], ["pubkey"]>;

  beforeAll(async function (): Promise<void> {
    circuit = await WitnessTester.construct(
      "circuits/shared/components/permitVerify/pubkeyRecover.circom",
      "RecoverEcdsaPubkey",
      { templateParams: ["64", "4"] },
    );
  }, 900_000);

  afterAll(async function (): Promise<void> {
    if (circuit) {
      await circuit.release();
    }
  });

  /** Override every surviving v / recovery_id signal; O2 may have folded some away. */
  async function flipRecoveryBit(witness: bigint[], flippedV: number): Promise<bigint[]> {
    const symbols = await circuit.readSymbols(witness);
    const targets = Object.keys(symbols).filter(
      (name) => symbols[name] !== undefined && /(\.v|recovery_id)$/.test(name),
    );
    expect(targets).toContain("main.signature.v");
    const overrides = Object.fromEntries(
      targets.map((name) => [
        name,
        name.endsWith("recovery_id") ? BigInt(flippedV - 27) : BigInt(flippedV),
      ]),
    );
    return circuit.editWitness(witness, overrides);
  }

  it("H1 (fixed): rejects the testator's pubkey with the recovery bit v flipped", async function (): Promise<void> {
    const genuine = signDigest(PRIVATE_KEY, DIGEST);
    const flipped = { ...genuine, v: 55 - genuine.v };

    // ecrecover binds v: the flipped signature recovers someone else
    expect(samePoint(ecrecover(genuine, DIGEST), genuine.pubkey)).toBe(true);
    expect(samePoint(ecrecover(flipped, DIGEST), genuine.pubkey)).toBe(false);

    const witness = await circuit.calculateWitness(circuitInput(genuine));
    await circuit.expectConstraintPass(witness);

    const forged = await flipRecoveryBit(witness, flipped.v);
    await circuit.expectConstraintFail(forged);
  });

  it("H1 (fixed): ethers' v is 27 + parity of (h/s) * G + (r/s) * Q for many signatures", function (): void {
    // The constraint binds v to the parity of the point the circuit computes; check
    // that this is exactly the convention ethers (and ecrecover) use
    const samples = sampleSignatures(PARITY_PROPERTY_SAMPLES);
    expect(new Set(samples.map(({ signature }) => signature.v))).toStrictEqual(new Set([27, 28]));

    for (const { signature, digest } of samples) {
      expect(signature.v).toBe(27 + verificationPointParity(signature, digest));
    }
  });

  it(
    "H1 (fixed): proves genuine signatures of both recovery parities",
    { timeout: 3_600_000 },
    async function (): Promise<void> {
      const signatures = signaturesCoveringBothParities(COMPLETENESS_PER_PARITY);
      const checkedParities = new Set<number>();

      for (const { signature, bitsMsghash: msghashBits } of signatures) {
        // Witness generation asserts every ===; run the full R1CS check once per parity
        const witness = await circuit.calculateWitness(circuitInput(signature, msghashBits));
        if (!checkedParities.has(signature.v)) {
          await circuit.expectConstraintPass(witness);
          checkedParities.add(signature.v);
        }
        const { pubkey } = await circuit.readSignals(witness, ["pubkey"]);
        expect(pubkey).toStrictEqual(toCircuitPubkey(signature.pubkey));
      }
    },
  );

  it("H2a: accepts the non-canonical s + n (ecrecover requires s < n)", async function (): Promise<void> {
    const canonical = craftWithSmallS(0xc0ffeen, 0x1234567n, DIGEST);
    const aliased = { ...canonical, s: canonical.s + CURVE.n };

    expect(aliased.s < 2n ** 256n).toBe(true);
    expect(samePoint(ecrecover(canonical, DIGEST), canonical.pubkey)).toBe(true);
    expect(ecrecover(aliased, DIGEST)).toBeNull();

    await circuit.expectPass(circuitInput(aliased), {
      pubkey: toCircuitPubkey(canonical.pubkey),
    });
  });

  it("H2b: accepts r = R.x with R.x in [n, p) (ecrecover requires r < n)", async function (): Promise<void> {
    const overflowing = craftWithOverflowingR(0x7777n, DIGEST);

    expect(overflowing.r >= CURVE.n && overflowing.r < CURVE.p).toBe(true);
    expect(ecrecover(overflowing, DIGEST)).toBeNull();

    await circuit.expectPass(circuitInput(overflowing), {
      pubkey: toCircuitPubkey(overflowing.pubkey),
    });
  });
});
