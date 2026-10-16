import { byteToBit, WitnessTester } from "./util/index.js";
import { hashTypedData } from "./logic/index.js";
import { Bit } from "./type/index.js";

describe("HashTypedData Circuit", function () {
  let circuit: WitnessTester<["permitDigest"], ["typedPermitDigest"]>;

  describe("Hash Typed Permit on Anvil", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/permitVerify/typedDataHash.circom",
        "HashTypedData",
        {
          templateParams: ["31337"],
        },
      );
      circuit.setConstraint("anvil");
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should produce anvil eip712 typed digest", async function (): Promise<void> {
      const permitDigest: Bit[] = byteToBit([
        204, 139, 10, 23, 198, 237, 70, 122, 65, 124, 47, 49, 209, 170, 99, 40,
        181, 74, 207, 144, 241, 114, 19, 110, 89, 82, 145, 158, 190, 100, 178,
        116,
      ]);

      const typedPermitDigest = hashTypedData(permitDigest, 31337);

      await circuit.expectPass(
        {
          permitDigest,
        },
        { typedPermitDigest },
      );
    });
  });

  describe("Hash Typed Permit on Arbitrum Sepolia", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/permitVerify/typedDataHash.circom",
        "HashTypedData",
        {
          templateParams: ["421614"],
        },
      );
      circuit.setConstraint("arbitrum sepolia");
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should produce arbitrum sepolia eip712 typed digest", async function (): Promise<void> {
      const permitDigest: Bit[] = byteToBit([
        204, 139, 10, 23, 198, 237, 70, 122, 65, 124, 47, 49, 209, 170, 99, 40,
        181, 74, 207, 144, 241, 114, 19, 110, 89, 82, 145, 158, 190, 100, 178,
        116,
      ]);

      const typedPermitDigest = hashTypedData(permitDigest, 421614);

      await circuit.expectPass(
        {
          permitDigest,
        },
        { typedPermitDigest },
      );
    });
  });

  describe("Hash Typed Permit on Mainnet", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/permitVerify/typedDataHash.circom",
        "HashTypedData",
        {
          templateParams: ["1"],
        },
      );
      circuit.setConstraint("mainnet");
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should produce mainnet eip712 typed digest", async function (): Promise<void> {
      const permitDigest: Bit[] = byteToBit([
        204, 139, 10, 23, 198, 237, 70, 122, 65, 124, 47, 49, 209, 170, 99, 40,
        181, 74, 207, 144, 241, 114, 19, 110, 89, 82, 145, 158, 190, 100, 178,
        116,
      ]);

      const typedPermitDigest = hashTypedData(permitDigest, 1);

      await circuit.expectPass(
        {
          permitDigest,
        },
        { typedPermitDigest },
      );
    });
  });

  describe("Hash Typed Permit on an Unsupported Chain", function (): void {
    it("should refuse to compile instead of falling back to another domain", async function (): Promise<void> {
      // Arbitrum One has no precomputed domain separator
      await expect(
        WitnessTester.construct(
          "circuits/shared/components/permitVerify/typedDataHash.circom",
          "HashTypedData",
          {
            templateParams: ["42161"],
          },
        ),
      ).rejects.toThrow(/assert/i);
    });
  });
});
