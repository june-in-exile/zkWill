import { Byte, Word } from "./type/index.js";
import { WitnessTester, wordToByte } from "./util/index.js";
import { transplantWitness, writeEvilCircuit } from "./util/forgery.js";
import type { Rewrite } from "./util/forgery.js";
import { gcmEncrypt } from "./logic/index.js";

/**
 * Soundness regression for the GHASH length block ([len(A)]64 || [len(C)]64).
 *
 * An evil copy of each GCM template lets the prover shift byte 0 of a length
 * field via `forge*Delta`. Its witness is transplanted into the original
 * circuit and checked against the original R1CS: a sound circuit must reject it.
 */

const CIRCUIT_DIR = "circuits/shared/components/aesGcm";
const EVIL_DIR = "circuits/test/evil";
const TEMPLATE_PARAMS = ["128", "12", "16", "16"];
const TEMPLATE_HEADER =
  "(keyBits, ivLength, textLengthBytes, aadLengthBytes) {";
const AAD_INPUT = "signal input {byte} aad[aadLengthBytes];";

type LengthField = "aad" | "text";
type Deltas = { forgeAadDelta: number; forgeTextDelta: number };

const HONEST: Deltas = { forgeAadDelta: 0, forgeTextDelta: 0 };
const FORGED: Record<LengthField, Deltas> = {
  aad: { forgeAadDelta: 1, forgeTextDelta: 0 },
  text: { forgeAadDelta: 0, forgeTextDelta: 1 },
};

const plaintext = [
  0x48, 0x69, 0x21, 0x20, 0x48, 0x6f, 0x77, 0x20, 0x61, 0x72, 0x65, 0x20, 0x79,
  0x6f, 0x75, 0x3f,
] as Byte[]; // "Hi! How are you?"
const key = [
  { bytes: [0x2b, 0x7e, 0x15, 0x16] },
  { bytes: [0x28, 0xae, 0xd2, 0xa6] },
  { bytes: [0xab, 0xf7, 0x15, 0x88] },
  { bytes: [0x09, 0xcf, 0x4f, 0x3c] },
] as Word[];
const iv = [
  0xca, 0xfe, 0xba, 0xbe, 0xfa, 0xce, 0xdb, 0xad, 0xde, 0xca, 0xf8, 0x88,
] as Byte[];
const aad = [
  0xfe, 0xed, 0xfa, 0xce, 0xde, 0xad, 0xbe, 0xef, 0xfe, 0xed, 0xfa, 0xce, 0xde,
  0xad, 0xbe, 0xef,
] as Byte[];
const honest = gcmEncrypt(plaintext, key, iv, aad);

function lengthFieldRewrites(field: LengthField): Rewrite[] {
  const acc = `acc${field === "aad" ? "Aad" : "Text"}LengthBits`;
  const delta = field === "aad" ? "forgeAadDelta" : "forgeTextDelta";
  const bits = `${field}LengthBits`;
  return [
    {
      pattern: `ghashInput[offset + i] <-- (${bits} >> 8 * (7 - i)) & 0xFF;`,
      replacement: `ghashInput[offset + i] <-- ((${bits} >> 8 * (7 - i)) + (i == 0 ? ${delta} : 0)) & 0xFF;`,
    },
    // Dropped so witness generation does not abort; the check that matters is
    // the original R1CS, which still contains this constraint.
    { pattern: `${acc}[7] === ${bits};`, replacement: "" },
  ];
}

async function constructEvil(templateName: string): Promise<WitnessTester> {
  const sourceFile = templateName === "GcmEncrypt" ? "gcmEncrypt" : "gcmDecrypt";
  const evilPath = await writeEvilCircuit(
    `${CIRCUIT_DIR}/${sourceFile}.circom`,
    `${EVIL_DIR}/evil${templateName}.circom`,
    [
      {
        pattern: `template ${templateName}${TEMPLATE_HEADER}`,
        replacement: `template Evil${templateName}${TEMPLATE_HEADER}`,
      },
      {
        pattern: AAD_INPUT,
        replacement: `${AAD_INPUT}\n    signal input forgeAadDelta;\n    signal input forgeTextDelta;`,
      },
      ...lengthFieldRewrites("aad"),
      ...lengthFieldRewrites("text"),
    ],
  );
  return WitnessTester.construct(evilPath, `Evil${templateName}`, {
    templateParams: TEMPLATE_PARAMS,
  });
}

/** The untagged wrapper names its inner component after the template. */
function renameEvilComponent(templateName: string): (name: string) => string {
  const component = `${templateName.toLowerCase()}Component`;
  return (name) =>
    name.replace(`main.evil${component}`, `main.${component}`);
}

describe("GCM length block soundness", function () {
  let encrypt: WitnessTester;
  let evilEncrypt: WitnessTester;
  let decrypt: WitnessTester;
  let evilDecrypt: WitnessTester;

  const encryptInput = { plaintext, key: wordToByte(key), iv, aad };

  beforeAll(async function (): Promise<void> {
    encrypt = await WitnessTester.construct(
      `${CIRCUIT_DIR}/gcmEncrypt.circom`,
      "GcmEncrypt",
      { templateParams: TEMPLATE_PARAMS },
    );
    decrypt = await WitnessTester.construct(
      `${CIRCUIT_DIR}/gcmDecrypt.circom`,
      "GcmDecrypt",
      { templateParams: TEMPLATE_PARAMS },
    );
    evilEncrypt = await constructEvil("GcmEncrypt");
    evilDecrypt = await constructEvil("GcmDecrypt");
  }, 900_000);

  afterAll(async function (): Promise<void> {
    // All four testers share one build directory, so release it once
    if (encrypt) {
      await encrypt.release();
    }
  });

  async function evilAuthTag(deltas: Deltas): Promise<bigint[]> {
    const witness = await evilEncrypt.calculateWitness({
      ...encryptInput,
      ...deltas,
    });
    const { authTag } = await evilEncrypt.readSignals(witness, ["authTag"]);
    return authTag as bigint[];
  }

  async function forgeEncryptWitness(deltas: Deltas): Promise<bigint[]> {
    const honestWitness = await encrypt.calculateWitness(encryptInput);
    const evilWitness = await evilEncrypt.calculateWitness({
      ...encryptInput,
      ...deltas,
    });
    return transplantWitness(
      encrypt,
      honestWitness,
      evilEncrypt,
      evilWitness,
      renameEvilComponent("GcmEncrypt"),
    );
  }

  async function forgeDecryptWitness(deltas: Deltas): Promise<bigint[]> {
    const decryptInput = {
      ciphertext: honest.ciphertext,
      key: wordToByte(key),
      iv,
      aad,
    };
    const honestWitness = await decrypt.calculateWitness({
      ...decryptInput,
      authTag: honest.authTag,
    });
    const evilWitness = await evilDecrypt.calculateWitness({
      ...decryptInput,
      authTag: await evilAuthTag(deltas),
      ...deltas,
    });
    return transplantWitness(
      decrypt,
      honestWitness,
      evilDecrypt,
      evilWitness,
      renameEvilComponent("GcmDecrypt"),
    );
  }

  it(
    "evil circuit computes an honest tag with zero deltas and a different tag otherwise",
    { timeout: 120_000 },
    async function (): Promise<void> {
      const honestTag = honest.authTag.map(BigInt);
      expect(await evilAuthTag(HONEST)).toEqual(honestTag);
      expect(await evilAuthTag(FORGED.aad)).not.toEqual(honestTag);
      expect(await evilAuthTag(FORGED.text)).not.toEqual(honestTag);
    },
  );

  describe("GcmEncrypt", function () {
    it(
      "accepts a transplanted honest witness",
      { timeout: 120_000 },
      async function (): Promise<void> {
        await encrypt.expectConstraintPass(await forgeEncryptWitness(HONEST));
      },
    );

    it.each(["aad", "text"] as const)(
      "rejects a forged %s length field",
      async function (field): Promise<void> {
        await encrypt.expectConstraintFail(
          await forgeEncryptWitness(FORGED[field]),
        );
      },
      120_000,
    );
  });

  describe("GcmDecrypt", function () {
    it(
      "accepts a transplanted honest witness",
      { timeout: 120_000 },
      async function (): Promise<void> {
        await decrypt.expectConstraintPass(await forgeDecryptWitness(HONEST));
      },
    );

    it.each(["aad", "text"] as const)(
      "rejects a forged %s length field with its matching forged tag",
      async function (field): Promise<void> {
        await decrypt.expectConstraintFail(
          await forgeDecryptWitness(FORGED[field]),
        );
      },
      120_000,
    );
  });
});
