import { SigningKey } from "ethers";
import { CURVE, ECDSA, EllipticCurve, MathUtils } from "../../logic/index.js";
import { byteToBit, hexToByte, splitBigInt } from "../../util/index.js";
import type { Bit, ConcatedEcdsaPoint, EcdsaSignature } from "../../type/index.js";

/**
 * Signatures crafted for the ECDSA acceptance-set audit.
 *
 * The circuit accepts (r, s, v, pubkey) whenever ECDSAVerifyNoPubkeyCheck holds,
 * whereas Permit2 accepts a signature only if ecrecover(h, v, r, s) returns the
 * testator. These helpers build inputs that sit in the gap between the two.
 */

type CraftedSignature = {
  r: bigint;
  s: bigint;
  v: number;
  pubkey: ConcatedEcdsaPoint;
};

const HALF_ORDER_EXPONENT = (CURVE.p + 1n) / 4n;

function toCircuitSignature({ r, s, v }: CraftedSignature): EcdsaSignature {
  return { r: splitBigInt(r), s: splitBigInt(s), v } as EcdsaSignature;
}

function toCircuitPubkey(point: ConcatedEcdsaPoint): bigint[][] {
  return [splitBigInt(point.x), splitBigInt(point.y)];
}

function digestToBits(digest: bigint): Bit[] {
  return byteToBit(hexToByte("0x" + digest.toString(16).padStart(64, "0")));
}

function negate(point: ConcatedEcdsaPoint): ConcatedEcdsaPoint {
  return { ...point, y: MathUtils.mod(-point.y, CURVE.p) };
}

/** Lift x to a curve point whose y has the requested parity, or null if x³ + 7 is not a square. */
function liftX(x: bigint, yParity: number): ConcatedEcdsaPoint | null {
  const ySquared = MathUtils.mod(x ** 3n + CURVE.b, CURVE.p);
  const y = MathUtils.modPow(ySquared, HALF_ORDER_EXPONENT, CURVE.p);
  if (MathUtils.mod(y * y, CURVE.p) !== ySquared) return null;
  const point = { x, y, isInfinity: false };
  return Number(y & 1n) === yParity ? point : negate(point);
}

/**
 * Solve the verification equation for the pubkey: given R, s, h and an integer r
 * (possibly >= n), Q = (r mod n)^-1 * (s * R - h * G) satisfies
 * (h / s) * G + (r / s) * Q = R, so the circuit sees R.x and compares it with r.
 */
function solvePubkey(
  point: ConcatedEcdsaPoint,
  r: bigint,
  s: bigint,
  digest: bigint,
): ConcatedEcdsaPoint {
  const sR = EllipticCurve.pointMultiply(MathUtils.mod(s, CURVE.n), point);
  const hG = EllipticCurve.pointMultiply(MathUtils.mod(digest, CURVE.n), ECDSA.G);
  const rInverse = MathUtils.modInverse(MathUtils.mod(r, CURVE.n), CURVE.n);
  return EllipticCurve.pointMultiply(rInverse, EllipticCurve.pointAdd(sR, negate(hG)));
}

/** A genuine signature from a private key, as Permit2 would receive it. */
function signDigest(privateKey: bigint, digest: bigint): CraftedSignature {
  const key = new SigningKey("0x" + privateKey.toString(16).padStart(64, "0"));
  const signature = key.sign("0x" + digest.toString(16).padStart(64, "0"));
  const pubkey = EllipticCurve.pointMultiply(privateKey, ECDSA.G);
  return { r: BigInt(signature.r), s: BigInt(signature.s), v: signature.v, pubkey };
}

/**
 * A valid signature (under a derived pubkey) whose s is chosen freely; small s
 * makes the non-canonical representative s + n fit in 256 bits.
 */
function craftWithSmallS(nonce: bigint, s: bigint, digest: bigint): CraftedSignature {
  const point = EllipticCurve.pointMultiply(nonce, ECDSA.G);
  const r = MathUtils.mod(point.x, CURVE.n);
  return { r, s, v: 27 + Number(point.y & 1n), pubkey: solvePubkey(point, r, s, digest) };
}

/**
 * A valid signature (under a derived pubkey) whose R.x lies in [n, p), with r
 * encoded as R.x itself instead of the canonical R.x - n.
 */
function craftWithOverflowingR(s: bigint, digest: bigint): CraftedSignature {
  const candidates = Array.from({ length: 64 }, (_, i) => CURVE.n + BigInt(i) + 1n);
  const x = candidates.find((candidate) => liftX(candidate, 0) !== null);
  if (x === undefined) throw new Error("No x in [n, n + 64] lifts to secp256k1");
  const point = liftX(x, 0)!;
  return { r: x, s, v: 27, pubkey: solvePubkey(point, x, s, digest) };
}

/**
 * ecrecover per the Yellow Paper (Appendix F): rejects r, s outside [1, n - 1]
 * and v outside {27, 28}; otherwise recovers the unique pubkey for that v.
 */
function ecrecover(sig: CraftedSignature, digest: bigint): ConcatedEcdsaPoint | null {
  const inRange = (value: bigint): boolean => value > 0n && value < CURVE.n;
  if (!inRange(sig.r) || !inRange(sig.s) || (sig.v !== 27 && sig.v !== 28)) return null;
  const point = liftX(sig.r, sig.v - 27);
  return point === null ? null : solvePubkey(point, sig.r, sig.s, digest);
}

/** Parity of R.y for the point ECDSAVerifyNoPubkeyCheckWithParity computes: (h/s) * G + (r/s) * Q. */
function verificationPointParity(sig: CraftedSignature, digest: bigint): number {
  const sInverse = MathUtils.modInverse(MathUtils.mod(sig.s, CURVE.n), CURVE.n);
  const u1 = MathUtils.mod(digest * sInverse, CURVE.n);
  const u2 = MathUtils.mod(sig.r * sInverse, CURVE.n);
  const point = EllipticCurve.pointAdd(
    EllipticCurve.pointMultiply(u1, ECDSA.G),
    EllipticCurve.pointMultiply(u2, sig.pubkey),
  );
  return Number(point.y & 1n);
}

function samePoint(a: ConcatedEcdsaPoint | null, b: ConcatedEcdsaPoint): boolean {
  return a !== null && a.x === b.x && a.y === b.y;
}

export {
  craftWithOverflowingR,
  craftWithSmallS,
  digestToBits,
  ecrecover,
  samePoint,
  signDigest,
  toCircuitPubkey,
  toCircuitSignature,
  verificationPointParity,
};
export type { CraftedSignature };
