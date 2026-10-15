import { Byte, Byte4, Byte16, Word, Word4 } from "./type/index.js";
import { WitnessTester, wordToByte, byteToWord } from "./util/index.js";
import {
  AESUtils,
  expandKey,
  subWord,
  subBytes,
  substituteBytes,
  shiftRows,
  mixColumn,
  mixColumns,
  addRoundKey,
  encryptBlock,
} from "./logic/index.js";

describe("ExpandKey Circuit", function () {
  let circuit: WitnessTester<["key"], ["roundKey"]>;

  describe("Key Expansion for AES-128", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aesGcm/encryptBlock.circom",
        "ExpandKey",
        {
          templateParams: ["128"],
        },
      );
      circuit.setConstraint("AES-128 key expansion");
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should expand 16-byte key to 176-byte correctly", async function (): Promise<void> {
      const key = [
        0x2b, 0x7e, 0x15, 0x16, 0x28, 0xae, 0xd2, 0xa6, 0xab, 0xf7, 0x15, 0x88,
        0x09, 0xcf, 0x4f, 0x3c,
      ];

      const keyBytes: Word[] = [];
      for (let i = 0; i < key.length; i += 4) {
        keyBytes.push({
          bytes: key.slice(i, i + 4) as Byte4,
        });
      }

      await circuit.expectPass({ key }, { roundKey: expandKey(keyBytes) });
    });
  });

  describe("Key Expansion for AES-192", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aesGcm/encryptBlock.circom",
        "ExpandKey",
        {
          templateParams: ["192"],
        },
      );
      circuit.setConstraint("AES-192 key expansion");
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should expand 24-byte key to 208-byte correctly", async function (): Promise<void> {
      const key = [
        0x8e, 0x73, 0xb0, 0xf7, 0xda, 0x0e, 0x64, 0x52, 0xc8, 0x10, 0xf3, 0x2b,
        0x80, 0x90, 0x79, 0xe5, 0x62, 0xf8, 0xea, 0xd2, 0x52, 0x2c, 0x6b, 0x7b,
      ];

      const keyBytes: Word[] = [];
      for (let i = 0; i < key.length; i += 4) {
        keyBytes.push({
          bytes: key.slice(i, i + 4) as Byte4,
        });
      }
      await circuit.expectPass({ key }, { roundKey: expandKey(keyBytes) });
    });
  });

  describe("Key Expansion for AES-256", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aesGcm/encryptBlock.circom",
        "ExpandKey",
        {
          templateParams: ["256"],
        },
      );
      circuit.setConstraint("AES-256 key expansion");
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should expand 32-byte key to 240-byte correctly", async function (): Promise<void> {
      const key = [
        0xaa, 0x6a, 0x44, 0x59, 0x14, 0x10, 0xfb, 0x0d, 0x61, 0xa7, 0xac, 0x45,
        0x62, 0x4a, 0x17, 0x15, 0x41, 0xd9, 0x03, 0xc3, 0xac, 0xef, 0x55, 0xd3,
        0x5b, 0x10, 0xd9, 0x21, 0xd3, 0x40, 0x4b, 0xba,
      ];

      const keyBytes: Word[] = [];
      for (let i = 0; i < key.length; i += 4) {
        keyBytes.push({
          bytes: key.slice(i, i + 4) as Byte4,
        });
      }

      await circuit.expectPass({ key }, { roundKey: expandKey(keyBytes) });
    });
  });
});

describe("SubWord Circuit", function () {
  let circuit: WitnessTester<["in"], ["out"]>;

  describe("Word Substitution", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aesGcm/encryptBlock.circom",
        "SubWord",
      );
      circuit.setConstraint("word substitution");
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should substitute random words according to AES specification", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const _in = Array.from(AESUtils.randomBytes(4));

        await circuit.expectPass(
          { in: _in },
          { out: subWord({ bytes: _in as Byte4 }) },
        );
      }
    });
  });
});

describe("SubBytes Circuit", function () {
  let circuit: WitnessTester<["in"], ["out"]>;

  describe("Bytes Substitution in Cipher", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aesGcm/encryptBlock.circom",
        "SubBytes",
      );
      circuit.setConstraint("16-byte substitution");
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should substitute random 4x4 bytes according to AES specification", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const _in = Array.from(AESUtils.randomBytes(16));

        await circuit.expectPass({ in: _in }, { out: subBytes(_in as Byte16) });
      }
    });
  });
});

describe("SubstituteBytes Circuit", function () {
  let circuit: WitnessTester<["in"], ["out"]>;

  describe("Single Byte Substitution", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aesGcm/encryptBlock.circom",
        "SubstituteBytes",
        {
          templateParams: ["1"],
        },
      );
      circuit.setConstraint("1-byte bytes substitution");
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should substitute all bytes according to AES specification", async function (): Promise<void> {
      for (let byte = 0x00; byte <= 0xff; byte++) {
        const _in = Array.from(Buffer.from([byte]));

        await circuit.expectPass(
          { in: _in },
          { out: substituteBytes(_in as Byte[]) },
        );
      }
    });
  });

  describe("4-Byte Bytes Substitution", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aesGcm/encryptBlock.circom",
        "SubstituteBytes",
        {
          templateParams: ["4"],
        },
      );
      circuit.setConstraint("4-byte bytes substitution");
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should substitute random bytes according to AES specification", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const _in = Array.from(AESUtils.randomBytes(4));

        await circuit.expectPass(
          { in: _in },
          { out: substituteBytes(_in as Byte[]) },
        );
      }
    });
  });

  describe("16-Byte Bytes Substitution", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aesGcm/encryptBlock.circom",
        "SubstituteBytes",
        {
          templateParams: ["16"],
        },
      );
      circuit.setConstraint("16-byte bytes substitution");
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should substitute random bytes according to AES specification", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const _in = Array.from(AESUtils.randomBytes(16));

        await circuit.expectPass(
          { in: _in },
          { out: substituteBytes(_in as Byte[]) },
        );
      }
    });
  });
});

describe("ShiftRows Circuit", function () {
  let circuit: WitnessTester<["in"], ["out"]>;

  describe("Row Shifting for Cipher", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aesGcm/encryptBlock.circom",
        "ShiftRows",
      );
      circuit.setConstraint("rows shifting");
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should shift rows according to AES specification", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const bytes = Array.from(AESUtils.randomBytes(16));

        await circuit.expectPass(
          { in: bytes },
          { out: shiftRows(bytes as Byte16) },
        );
      }
    });

    it("should handle test vectors in column-major", async function (): Promise<void> {
      await circuit.expectPass(
        {
          in: [
            0x00, 0x01, 0x02, 0x03, 0x10, 0x11, 0x12, 0x13, 0x20, 0x21, 0x22,
            0x23, 0x30, 0x31, 0x32, 0x33,
          ],
        },
        {
          out: [
            0x00, 0x11, 0x22, 0x33, 0x10, 0x21, 0x32, 0x03, 0x20, 0x31, 0x02,
            0x13, 0x30, 0x01, 0x12, 0x23,
          ],
        },
      );
    });
  });
});

describe("MixColumn Circuit", function () {
  let circuit: WitnessTester<["in"], ["out"]>;

  describe("MixColumns Transformation for a Single Column", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aesGcm/encryptBlock.circom",
        "MixColumn",
      );
      circuit.setConstraint("column mixing");
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should correctly transform random columns", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const _in = Array.from(AESUtils.randomBytes(4));

        await circuit.expectPass({ in: _in }, { out: mixColumn(_in as Byte4) });
      }
    });

    it("should handle known test vectors correctly", async function (): Promise<void> {
      const testCases = [
        {
          _in: [0x00, 0x00, 0x00, 0x00], // Zero column
          _out: [0x00, 0x00, 0x00, 0x00],
        },
        {
          _in: [0x01, 0x01, 0x01, 0x01], // All ones
          _out: [0x01, 0x01, 0x01, 0x01],
        },
        {
          _in: [0xff, 0xff, 0xff, 0xff], // All 0xff
          _out: [0xff, 0xff, 0xff, 0xff],
        },
        {
          _in: [0x01, 0x00, 0x00, 0x00], // Unit vector e1
          _out: [0x02, 0x01, 0x01, 0x03],
        },
        {
          _in: [0x00, 0x01, 0x00, 0x00], // Unit vector e2
          _out: [0x03, 0x02, 0x01, 0x01],
        },
        {
          _in: [0x00, 0x00, 0x01, 0x00], // Unit vector e3
          _out: [0x01, 0x03, 0x02, 0x01],
        },
        {
          _in: [0x00, 0x00, 0x00, 0x01], // Unit vector e4
          _out: [0x01, 0x01, 0x03, 0x02],
        },
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
      }
    });

    it("should handle edge cases", async function (): Promise<void> {
      const columns = [
        [0x80, 0x80, 0x80, 0x80], // MSB set values
        [0x7f, 0x7f, 0x7f, 0x7f], // Just below MSB
        [0xaa, 0x55, 0xaa, 0x55], // Alternating pattern
        [0x53, 0xca, 0x17, 0x8e], // Mixed complex values
      ];

      for (const col of columns) {
        await circuit.expectPass({ in: col }, { out: mixColumn(col as Byte4) });
      }
    });
  });
});

describe("MixColumns Circuit", function () {
  let circuit: WitnessTester<["in"], ["out"]>;

  describe("MixColumns Transformation for the Entire 16-byte State", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aesGcm/encryptBlock.circom",
        "MixColumns",
      );
      circuit.setConstraint("columns mixing");
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should correctly transform random states", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const _in = Array.from(AESUtils.randomBytes(16));

        await circuit.expectPass(
          { in: _in },
          { out: mixColumns(_in as Byte16) },
        );
      }
    });

    it("should handle known AES test vectors", async function (): Promise<void> {
      const testCases = [
        {
          _in: new Array(16).fill(0), // Zero state
          _out: new Array(16).fill(0),
        },
        {
          _in: new Array(16).fill(0x01), // All ones state
          _out: mixColumns(new Array(16).fill(0x01) as Byte16),
        },
        {
          _in: [
            // AES FIPS 197 example
            0xd4, // Column 0
            0xe0,
            0xb8,
            0x1e,
            0xbf, // Column 1
            0xb4,
            0x41,
            0x27,
            0x5d, // Column 2
            0x52,
            0x11,
            0x98,
            0x30, // Column 3
            0xae,
            0xf1,
            0xe5,
          ],
          _out: mixColumns([
            0xd4, 0xe0, 0xb8, 0x1e, 0xbf, 0xb4, 0x41, 0x27, 0x5d, 0x52, 0x11,
            0x98, 0x30, 0xae, 0xf1, 0xe5,
          ]),
        },
        {
          _in: [
            // Identity-like state
            0x01, // Col 0: e1
            0x00,
            0x00,
            0x00,
            0x00, // Col 1: e2
            0x01,
            0x00,
            0x00,
            0x00, // Col 2: e3
            0x00,
            0x01,
            0x00,
            0x00, // Col 3: e4
            0x00,
            0x00,
            0x01,
          ],
          _out: [
            0x02, 0x01, 0x01, 0x03, 0x03, 0x02, 0x01, 0x01, 0x01, 0x03, 0x02,
            0x01, 0x01, 0x01, 0x03, 0x02,
          ],
        },
      ];

      for (const { _in, _out } of testCases) {
        await circuit.expectPass({ in: _in }, { out: _out });
      }
    });

    it("should handle edge cases for full state", async function (): Promise<void> {
      const testCases = [
        {
          _in: new Array(16).fill(0xff), // All maximum values
        },
        {
          _in: new Array(16).fill(0x80), // MSB set pattern
        },
        {
          _in: Array.from({ length: 16 }, (_, i) =>
            i % 2 === 0 ? 0xaa : 0x55,
          ), // Alternating pattern across state
        },
        {
          _in: Array.from({ length: 16 }, (_, i) => i * 0x11), // Sequential values
        },
      ];

      for (const { _in } of testCases) {
        await circuit.expectPass(
          { in: _in },
          { out: mixColumns(_in as Byte16) },
        );
      }
    });
  });
});

describe("AddRoundKey Circuit", function () {
  let circuit: WitnessTester<["state", "roundKey"], ["out"]>;

  describe("AddRoundKey Transformation", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aesGcm/encryptBlock.circom",
        "AddRoundKey",
      );
      circuit.setConstraint("round key addition");
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should correctly XOR state with round key", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const state = Array.from(AESUtils.randomBytes(16));
        const roundKey = Array.from(AESUtils.randomBytes(16)) as Byte[];
        const roundKeyWords = byteToWord(roundKey);

        await circuit.expectPass(
          { state, roundKey },
          addRoundKey(state as Byte16, roundKeyWords as Word4),
        );
      }
    });
  });
});

describe("EncryptBlock Circuit", function () {
  let circuit: WitnessTester<["plaintext", "key"], ["ciphertext"]>;

  describe("AES-128 Block Cipher", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aesGcm/encryptBlock.circom",
        "EncryptBlock",
        {
          templateParams: ["128"],
        },
      );
      circuit.setConstraint("AES-128 block cipher");
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should handle random inputs consistently", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const plaintext = Array.from(AESUtils.randomBytes(16)) as Byte16;
        const key = Array.from(AESUtils.randomBytes(16)) as Byte[];

        await circuit.expectPass(
          { plaintext, key },
          { ciphertext: encryptBlock(plaintext, byteToWord(key)) },
        );
      }
    });
  });

  describe("AES-192 Block Cipher", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aesGcm/encryptBlock.circom",
        "EncryptBlock",
        {
          templateParams: ["192"],
        },
      );
      circuit.setConstraint("AES-192 block cipher");
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should handle random inputs consistently", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const plaintext = Array.from(AESUtils.randomBytes(16)) as Byte16;
        const key = Array.from(AESUtils.randomBytes(24)) as Byte[];

        await circuit.expectPass(
          { plaintext, key },
          { ciphertext: encryptBlock(plaintext, byteToWord(key)) },
        );
      }
    });
  });

  describe("AES-256 Block Cipher", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aesGcm/encryptBlock.circom",
        "EncryptBlock",
        {
          templateParams: ["256"],
        },
      );
      circuit.setConstraint("AES-256 block cipher");
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should correctly encrypt using NIST test vectors", async function (): Promise<void> {
      const testCases = [
        {
          // NIST FIPS 197 Appendix C.3
          plaintext: [
            0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa,
            0xbb, 0xcc, 0xdd, 0xee, 0xff,
          ],
          key: [
            { bytes: [0x00, 0x01, 0x02, 0x03] },
            { bytes: [0x04, 0x05, 0x06, 0x07] },
            { bytes: [0x08, 0x09, 0x0a, 0x0b] },
            { bytes: [0x0c, 0x0d, 0x0e, 0x0f] },
            { bytes: [0x10, 0x11, 0x12, 0x13] },
            { bytes: [0x14, 0x15, 0x16, 0x17] },
            { bytes: [0x18, 0x19, 0x1a, 0x1b] },
            { bytes: [0x1c, 0x1d, 0x1e, 0x1f] },
          ],
          ciphertext: [
            0x8e, 0xa2, 0xb7, 0xca, 0x51, 0x67, 0x45, 0xbf, 0xea, 0xfc, 0x49,
            0x90, 0x4b, 0x49, 0x60, 0x89,
          ],
        },
        {
          // NIST SP 800-38A F.1.5 ECB-AES256.Encrypt Block #1
          plaintext: [
            0x6b, 0xc1, 0xbe, 0xe2, 0x2e, 0x40, 0x9f, 0x96, 0xe9, 0x3d, 0x7e,
            0x11, 0x73, 0x93, 0x17, 0x2a,
          ],
          key: [
            { bytes: [0x60, 0x3d, 0xeb, 0x10] },
            { bytes: [0x15, 0xca, 0x71, 0xbe] },
            { bytes: [0x2b, 0x73, 0xae, 0xf0] },
            { bytes: [0x85, 0x7d, 0x77, 0x81] },
            { bytes: [0x1f, 0x35, 0x2c, 0x07] },
            { bytes: [0x3b, 0x61, 0x08, 0xd7] },
            { bytes: [0x2d, 0x98, 0x10, 0xa3] },
            { bytes: [0x09, 0x14, 0xdf, 0xf4] },
          ],
          ciphertext: [
            0xf3, 0xee, 0xd1, 0xbd, 0xb5, 0xd2, 0xa0, 0x3c, 0x06, 0x4b, 0x5a,
            0x7e, 0x3d, 0xb1, 0x81, 0xf8,
          ],
        },
      ];

      for (const { plaintext, key, ciphertext } of testCases) {
        await circuit.expectPass(
          { plaintext, key: wordToByte(key as Word[]) },
          { ciphertext },
        );
      }
    });

    it("should handle random inputs consistently", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const plaintext = Array.from(AESUtils.randomBytes(16)) as Byte16;
        const key = Array.from(AESUtils.randomBytes(32)) as Byte[];

        await circuit.expectPass(
          { plaintext, key },
          { ciphertext: encryptBlock(plaintext, byteToWord(key)) },
        );
      }
    });
  });
});

describe("EncryptBlockWithRoundKeys Circuit", function () {
  let circuit: WitnessTester<["plaintext", "roundKey"], ["ciphertext"]>;

  describe("AES-128 Block Cipher with Pre-expanded Key", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aesGcm/encryptBlock.circom",
        "EncryptBlockWithRoundKeys",
        {
          templateParams: ["128"],
        },
      );
      circuit.setConstraint("AES-128 block cipher with pre-expanded key");
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should exclude key expansion from the constraint count", async function (): Promise<void> {
      // EncryptBlock(128) - ExpandKey(128) = 86432 - 15040
      await circuit.expectConstraintCount(71392, true);
    });

    it("should match EncryptBlock on random inputs", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const plaintext = Array.from(AESUtils.randomBytes(16)) as Byte16;
        const key = byteToWord(Array.from(AESUtils.randomBytes(16)) as Byte[]);

        await circuit.expectPass(
          { plaintext, roundKey: wordToByte(expandKey(key)) },
          { ciphertext: encryptBlock(plaintext, key) },
        );
      }
    });
  });

  describe("AES-256 Block Cipher with Pre-expanded Key", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aesGcm/encryptBlock.circom",
        "EncryptBlockWithRoundKeys",
        {
          templateParams: ["256"],
        },
      );
      circuit.setConstraint("AES-256 block cipher with pre-expanded key");
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should exclude key expansion from the constraint count", async function (): Promise<void> {
      // EncryptBlock(256) - ExpandKey(256) = 119936 - 18976
      await circuit.expectConstraintCount(100960, true);
    });

    it("should correctly encrypt using NIST test vectors", async function (): Promise<void> {
      // NIST FIPS 197 Appendix C.3
      const plaintext = [
        0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb,
        0xcc, 0xdd, 0xee, 0xff,
      ];
      const key = byteToWord(Array.from({ length: 32 }, (_, i) => i) as Byte[]);
      const ciphertext = [
        0x8e, 0xa2, 0xb7, 0xca, 0x51, 0x67, 0x45, 0xbf, 0xea, 0xfc, 0x49, 0x90,
        0x4b, 0x49, 0x60, 0x89,
      ];

      await circuit.expectPass(
        { plaintext, roundKey: wordToByte(expandKey(key)) },
        { ciphertext },
      );
    });

    it("should match EncryptBlock on random inputs", async function (): Promise<void> {
      for (let i = 0; i < 3; i++) {
        const plaintext = Array.from(AESUtils.randomBytes(16)) as Byte16;
        const key = byteToWord(Array.from(AESUtils.randomBytes(32)) as Byte[]);

        await circuit.expectPass(
          { plaintext, roundKey: wordToByte(expandKey(key)) },
          { ciphertext: encryptBlock(plaintext, key) },
        );
      }
    });
  });
});
