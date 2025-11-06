import {
  WitnessTester,
  splitBigInt,
  flattenEcdsaSignature,
  flattenTokenPermissions,
} from "./util/index.js";
import {
  EcdsaSignature,
  Estate,
  Nonce,
  TokenPermission,
  Timestamp,
} from "./type/index.js";
import { Permit2 } from "./logic/index.js";

describe.skip("Show VerifyPermit Input", function (): void {
  it("prints input for permit verification circuit", async function (): Promise<void> {
    const signedWills = [
      {
        // This should pass
        testator: "0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc",
        estates: [
          {
            beneficiary: "0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c",
            token: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
            amount: 1000,
          },
        ],
        salt: "71360251393970899168177271300798976507922078655443308073773920152027613498891",
        will: "0xcf1ddAE44C3F17AD11D483d8B308A63823D84C69",
        permit2: {
          nonce: "260220001296582517507056684092646723287",
          deadline: 1789935794,
          signature:
            "0x3f301e8d8dd7296723525f58b0e7e7d5ded0fc7b47b59376c6fdfa707cef0cf5616d34ded1c97090b9b563027b90cfec4398330230a909a6eed59aad30ea74941b",
        },
      },
      {
        // This should pass
        testator: "0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc",
        estates: [
          {
            beneficiary: "0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c",
            token: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
            amount: 1000,
          },
          {
            beneficiary: "0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c",
            token: "0xb1D4538B4571d411F07960EF2838Ce337FE1E80E",
            amount: 5000000,
          },
        ],
        salt: "94954521252983622768039926583524609948798798270154468687761047644943024694719",
        will: "0xeD3E06D64e614A0D783Bb7697805F610C8b30192",
        permit2: {
          nonce: "321192806206881906605938271299912539543",
          deadline: 1789936028,
          signature:
            "0x03407cb8b469f1ac88c3889ebac732a0634f52e2a8115c4572e2b90d10e48e17130aee6646e8ad5ecfe2efbf47cb7d36630326d1e34774e37e6a2ee17c0885d11b",
        },
      },
      {
        // This should fail due to invalid testator
        testator: "0x041F57c4492760aaE44ECed29b49a30DaAD3D4Ca",
        estates: [
          {
            beneficiary: "0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c",
            token: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
            amount: 1000,
          },
          {
            beneficiary: "0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c",
            token: "0xb1D4538B4571d411F07960EF2838Ce337FE1E80E",
            amount: 5000000,
          },
        ],
        salt: "94954521252983622768039926583524609948798798270154468687761047644943024694719",
        will: "0xeD3E06D64e614A0D783Bb7697805F610C8b30192",
        permit2: {
          nonce: "321192806206881906605938271299912539543",
          deadline: 1789936028,
          signature:
            "0x03407cb8b469f1ac88c3889ebac732a0634f52e2a8115c4572e2b90d10e48e17130aee6646e8ad5ecfe2efbf47cb7d36630326d1e34774e37e6a2ee17c0885d11b",
        },
      },
      {
        // This should fail due to invalid token
        testator: "0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc",
        estates: [
          {
            beneficiary: "0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c",
            token: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4f",
            amount: 1000,
          },
          {
            beneficiary: "0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c",
            token: "0xb1D4538B4571d411F07960EF2838Ce337FE1E80f",
            amount: 5000000,
          },
        ],
        salt: "94954521252983622768039926583524609948798798270154468687761047644943024694719",
        will: "0xeD3E06D64e614A0D783Bb7697805F610C8b30192",
        permit2: {
          nonce: "321192806206881906605938271299912539543",
          deadline: 1789936028,
          signature:
            "0x03407cb8b469f1ac88c3889ebac732a0634f52e2a8115c4572e2b90d10e48e17130aee6646e8ad5ecfe2efbf47cb7d36630326d1e34774e37e6a2ee17c0885d11b",
        },
      },
      {
        // This should fail due to invalid amount
        testator: "0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc",
        estates: [
          {
            beneficiary: "0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c",
            token: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
            amount: 999,
          },
          {
            beneficiary: "0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c",
            token: "0xb1D4538B4571d411F07960EF2838Ce337FE1E80E",
            amount: 5000001,
          },
        ],
        salt: "94954521252983622768039926583524609948798798270154468687761047644943024694719",
        will: "0xeD3E06D64e614A0D783Bb7697805F610C8b30192",
        permit2: {
          nonce: "321192806206881906605938271299912539543",
          deadline: 1789936028,
          signature:
            "0x03407cb8b469f1ac88c3889ebac732a0634f52e2a8115c4572e2b90d10e48e17130aee6646e8ad5ecfe2efbf47cb7d36630326d1e34774e37e6a2ee17c0885d11b",
        },
      },
      {
        // This should fail due to invalid deadline
        testator: "0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc",
        estates: [
          {
            beneficiary: "0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c",
            token: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
            amount: 1000,
          },
          {
            beneficiary: "0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c",
            token: "0xb1D4538B4571d411F07960EF2838Ce337FE1E80E",
            amount: 5000000,
          },
        ],
        salt: "94954521252983622768039926583524609948798798270154468687761047644943024694719",
        will: "0xeD3E06D64e614A0D783Bb7697805F610C8b30192",
        permit2: {
          nonce: "321192806206881906605938271299912539543",
          deadline: 1789936030,
          signature:
            "0x03407cb8b469f1ac88c3889ebac732a0634f52e2a8115c4572e2b90d10e48e17130aee6646e8ad5ecfe2efbf47cb7d36630326d1e34774e37e6a2ee17c0885d11b",
        },
      },
      {
        // This should fail due to invalid signature
        testator: "0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc",
        estates: [
          {
            beneficiary: "0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c",
            token: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
            amount: 1000,
          },
          {
            beneficiary: "0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c",
            token: "0xb1D4538B4571d411F07960EF2838Ce337FE1E80E",
            amount: 5000000,
          },
        ],
        salt: "94954521252983622768039926583524609948798798270154468687761047644943024694719",
        will: "0xeD3E06D64e614A0D783Bb7697805F610C8b30192",
        permit2: {
          nonce: "321192806206881906605938271299912539543",
          deadline: 1789936028,
          signature:
            "0x03407cb8b469f1ac88c3889ebac732a0634f52e2a8115c4572e2b90d10e48e17130aee6646e8ad5ecfe2efbf47cb7d36630326d1e34774e37e6a2ee17c0885d11c",
        },
      },
      {
        // This should pass since beneficiaries are not verified
        testator: "0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc",
        estates: [
          {
            beneficiary: "0x0000000000000000000000000000000000000000",
            token: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
            amount: 1000,
          },
          {
            beneficiary: "0x0000000000000000000000000000000000000000",
            token: "0xb1D4538B4571d411F07960EF2838Ce337FE1E80E",
            amount: 5000000,
          },
        ],
        salt: "94954521252983622768039926583524609948798798270154468687761047644943024694719",
        will: "0xeD3E06D64e614A0D783Bb7697805F610C8b30192",
        permit2: {
          nonce: "321192806206881906605938271299912539543",
          deadline: 1789936028,
          signature:
            "0x03407cb8b469f1ac88c3889ebac732a0634f52e2a8115c4572e2b90d10e48e17130aee6646e8ad5ecfe2efbf47cb7d36630326d1e34774e37e6a2ee17c0885d11b",
        },
      },
      {
        // This should pass since salt are not included in input
        testator: "0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc",
        estates: [
          {
            beneficiary: "0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c",
            token: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
            amount: 1000,
          },
          {
            beneficiary: "0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c",
            token: "0xb1D4538B4571d411F07960EF2838Ce337FE1E80E",
            amount: 5000000,
          },
        ],
        salt: "0",
        will: "0xeD3E06D64e614A0D783Bb7697805F610C8b30192",
        permit2: {
          nonce: "321192806206881906605938271299912539543",
          deadline: 1789936028,
          signature:
            "0x03407cb8b469f1ac88c3889ebac732a0634f52e2a8115c4572e2b90d10e48e17130aee6646e8ad5ecfe2efbf47cb7d36630326d1e34774e37e6a2ee17c0885d11b",
        },
      },
    ];

    console.log(`Circuit input (copy and paste to input file directly):`);
    for (const { testator, estates, will, permit2 } of signedWills) {
      const { r, s, v } = Permit2.decodeSignature(permit2.signature);
      const input = {
        testator: BigInt(testator),
        permit: [
          ...estates.flatMap((estate) => [
            // BigInt(estate.beneficiary),
            BigInt(estate.token),
            estate.amount,
          ]),
          permit2.nonce,
          permit2.deadline,
        ],
        will: BigInt(will),
        signature: [...splitBigInt(r), ...splitBigInt(s), v],
      };
      console.log(`\nVerifyPermit(${estates.length}):`);
      console.log(JSON.stringify(input, null, 2));
    }
  });
});

describe("VerifyPermit Circuit", function () {
  let circuit: WitnessTester<["testator", "permit", "will", "signature"]>;

  describe("Verify Permit with 1 Estate", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/permitVerify/permitVerify.circom",
        "VerifyPermit",
        {
          templateParams: ["1"],
        },
      );
      circuit.setConstraint("permit with 1 estate");
    }, 120_000);

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should accept the verification for valid permit", async function (): Promise<void> {
      const testWills = [
        {
          testator: BigInt("0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc"),
          estates: [
            {
              beneficiary: BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c"),
              token: BigInt("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"),
              amount: 1000n,
            },
          ] as Estate[],
          salt: 34923565688810067994128788310589615222681366992060360220693714303919665482853n,
          will: BigInt("0x3FeBe97292fC5B32903c88D561Cd1E701228199C"),
          nonce: 244376007658491587519721798548739170223n as Nonce,
          deadline: 1789798304 as Timestamp,
          signature: {
            r: splitBigInt(
              BigInt(
                "0xa5ffc2a554b20c9d9dc7760cf0046881ee8899022e41ffc5652ba7c18848ad9e",
              ),
            ),
            s: splitBigInt(
              BigInt(
                "0x5336e7e82553e531bd45518baf61c5438c98e61c7d0067baa523e47c7f58fe9c",
              ),
            ),
            v: 28,
          } as EcdsaSignature,
        },
      ];

      for (const {
        testator,
        estates,
        will,
        nonce,
        deadline,
        signature,
      } of testWills) {
        const permitted: TokenPermission[] = estates.map((e) => ({
          token: e.token,
          amount: e.amount,
        }));
        await circuit.expectPass({
          testator,
          permit: [...flattenTokenPermissions(permitted), nonce, deadline],
          will,
          signature: flattenEcdsaSignature(signature),
        });
      }
    });

    it("should reject the verification for invalid permit", async function (): Promise<void> {
      const testWills = [
        {
          testator: BigInt("0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc") - 1n, // invalid testator
          estates: [
            {
              beneficiary: BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c"),
              token: BigInt("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"),
              amount: 1000n,
            },
          ] as Estate[],
          salt: 34923565688810067994128788310589615222681366992060360220693714303919665482853n,
          will: BigInt("0x3FeBe97292fC5B32903c88D561Cd1E701228199C"),
          nonce: 244376007658491587519721798548739170223n as Nonce,
          deadline: 1789798304 as Timestamp,
          signature: {
            r: splitBigInt(
              BigInt(
                "0xa5ffc2a554b20c9d9dc7760cf0046881ee8899022e41ffc5652ba7c18848ad9e",
              ),
            ),
            s: splitBigInt(
              BigInt(
                "0x5336e7e82553e531bd45518baf61c5438c98e61c7d0067baa523e47c7f58fe9c",
              ),
            ),
            v: 28,
          } as EcdsaSignature,
        },
        {
          testator: BigInt("0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc"),
          estates: [
            {
              beneficiary: BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c"),
              token: BigInt("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d") + 1n, // invalid token
              amount: 1000n,
            },
          ] as Estate[],
          salt: 34923565688810067994128788310589615222681366992060360220693714303919665482853n,
          will: BigInt("0x3FeBe97292fC5B32903c88D561Cd1E701228199C"),
          nonce: 244376007658491587519721798548739170223n as Nonce,
          deadline: 1789798304 as Timestamp,
          signature: {
            r: splitBigInt(
              BigInt(
                "0xa5ffc2a554b20c9d9dc7760cf0046881ee8899022e41ffc5652ba7c18848ad9e",
              ),
            ),
            s: splitBigInt(
              BigInt(
                "0x5336e7e82553e531bd45518baf61c5438c98e61c7d0067baa523e47c7f58fe9c",
              ),
            ),
            v: 28,
          } as EcdsaSignature,
        },
        {
          testator: BigInt("0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc"),
          estates: [
            {
              beneficiary: BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c"),
              token: BigInt("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"),
              amount: 1000n - 1n, // invalid amount
            },
          ] as Estate[],
          salt: 34923565688810067994128788310589615222681366992060360220693714303919665482853n,
          will: BigInt("0x3FeBe97292fC5B32903c88D561Cd1E701228199C"),
          nonce: 244376007658491587519721798548739170223n as Nonce,
          deadline: 1789798304 as Timestamp,
          signature: {
            r: splitBigInt(
              BigInt(
                "0xa5ffc2a554b20c9d9dc7760cf0046881ee8899022e41ffc5652ba7c18848ad9e",
              ),
            ),
            s: splitBigInt(
              BigInt(
                "0x5336e7e82553e531bd45518baf61c5438c98e61c7d0067baa523e47c7f58fe9c",
              ),
            ),
            v: 28,
          } as EcdsaSignature,
        },
        {
          testator: BigInt("0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc"),
          estates: [
            {
              beneficiary: BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c"),
              token: BigInt("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"),
              amount: 1000n,
            },
          ] as Estate[],
          salt: 34923565688810067994128788310589615222681366992060360220693714303919665482853n,
          will: BigInt("0x3FeBe97292fC5B32903c88D561Cd1E701228199C"),
          nonce: 244376007658491587519721798548739170223n as Nonce,
          deadline: (1789798304 - 1) as Timestamp, // invalid deadline
          signature: {
            r: splitBigInt(
              BigInt(
                "0xa5ffc2a554b20c9d9dc7760cf0046881ee8899022e41ffc5652ba7c18848ad9e",
              ),
            ),
            s: splitBigInt(
              BigInt(
                "0x5336e7e82553e531bd45518baf61c5438c98e61c7d0067baa523e47c7f58fe9c",
              ),
            ),
            v: 28,
          } as EcdsaSignature,
        },
        {
          testator: BigInt("0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc"),
          estates: [
            {
              beneficiary: BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c"),
              token: BigInt("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"),
              amount: 1000n,
            },
          ] as Estate[],
          salt: 34923565688810067994128788310589615222681366992060360220693714303919665482853n,
          will: BigInt("0x3FeBe97292fC5B32903c88D561Cd1E701228199C"),
          nonce: 244376007658491587519721798548739170223n as Nonce,
          deadline: 1789798304 as Timestamp,
          signature: {
            r: splitBigInt(
              BigInt(
                "0xa5ffc2a554b20c9d9dc7760cf0046881ee8899022e41ffc5652ba7c18848ad9e",
              ),
            ),
            s: splitBigInt(
              BigInt(
                "0x5336e7e82553e531bd45518baf61c5438c98e61c7d0067baa523e47c7f58fe9c",
              ),
            ),
            v: 27, // invalid signature
          } as EcdsaSignature,
        },
      ];

      for (const {
        testator,
        estates,
        will,
        nonce,
        deadline,
        signature,
      } of testWills) {
        const permitted: TokenPermission[] = estates.map((e) => ({
          token: e.token,
          amount: e.amount,
        }));
        await circuit.expectFail({
          testator,
          permit: [...flattenTokenPermissions(permitted), nonce, deadline],
          will,
          signature: flattenEcdsaSignature(signature),
        });
      }
    });

    it("should ignore beneficiaries and salt", async function (): Promise<void> {
      const testWills = [
        {
          testator: BigInt("0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc"),
          estates: [
            {
              beneficiary:
                BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c") + 1n, // invalid beneficiary
              token: BigInt("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"),
              amount: 1000n,
            },
          ] as Estate[],
          salt: 0n, // invalid salt
          will: BigInt("0x3FeBe97292fC5B32903c88D561Cd1E701228199C"),
          nonce: 244376007658491587519721798548739170223n as Nonce,
          deadline: 1789798304 as Timestamp,
          signature: {
            r: splitBigInt(
              BigInt(
                "0xa5ffc2a554b20c9d9dc7760cf0046881ee8899022e41ffc5652ba7c18848ad9e",
              ),
            ),
            s: splitBigInt(
              BigInt(
                "0x5336e7e82553e531bd45518baf61c5438c98e61c7d0067baa523e47c7f58fe9c",
              ),
            ),
            v: 28,
          } as EcdsaSignature,
        },
      ];

      for (const {
        testator,
        estates,
        will,
        nonce,
        deadline,
        signature,
      } of testWills) {
        const permitted: TokenPermission[] = estates.map((e) => ({
          token: e.token,
          amount: e.amount,
        }));
        await circuit.expectPass({
          testator,
          permit: [...flattenTokenPermissions(permitted), nonce, deadline],
          will,
          signature: flattenEcdsaSignature(signature),
        });
      }
    });
  });

  describe("Verify Permit with 2 Estates", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/permitVerify/permitVerify.circom",
        "VerifyPermit",
        {
          templateParams: ["2"],
        },
      );
      circuit.setConstraint("permit with 2 estates");
    }, 120_000);

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it.only(
      "should accept the verification for valid permit",
      { timeout: 60_000 },
      async function (): Promise<void> {
        const testWills = [
          {
            testator: BigInt("0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc"),
            executor: BigInt("0xF85d255D10EbA7Ec5a12724D134420A3C2b8EA3a"),
            estates: [
              {
                beneficiary: BigInt(
                  "0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c",
                ),
                token: BigInt("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"),
                amount: 1000n,
              },
              {
                beneficiary: BigInt(
                  "0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c",
                ),
                token: BigInt("0xb1D4538B4571d411F07960EF2838Ce337FE1E80E"),
                amount: 5000000n,
              },
            ] as Estate[],
            salt: 12694447595861466419244258169335441343265382743954236586072546691080547501349n,
            will: BigInt("0xCfD7d00d14F04c021cB76647ACe8976580B83D54"),
            nonce: 307798376644172688526653206965886192621n as Nonce,
            deadline: 1789652776 as Timestamp,
            signature: {
              r: splitBigInt(
                BigInt(
                  "0xe2c3427d586d098f41d41f1a6c45dc61bc47bdf47ea0b74bbacee7e1fdaa8af8",
                ),
              ),
              s: splitBigInt(
                BigInt(
                  "0x73434b90e656c5332de72de6e9ede658973947bc497fa4edafd9789de84b38ef",
                ),
              ),
              v: 27,
            } as EcdsaSignature,
          },
          // { /* for Arbitrum Sepolia */
          //   testator: BigInt("0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc"),
          //   executor: BigInt("0xF85d255D10EbA7Ec5a12724D134420A3C2b8EA3a"),
          //   estates: [
          //     {
          //       beneficiary: BigInt(
          //         "0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c",
          //       ),
          //       token: BigInt("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"),
          //       amount: 1000n,
          //     },
          //     {
          //       beneficiary: BigInt(
          //         "0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c",
          //       ),
          //       token: BigInt("0xb1D4538B4571d411F07960EF2838Ce337FE1E80E"),
          //       amount: 5000000n,
          //     },
          //   ] as Estate[],
          //   salt: 50488959960934814917696171139809710418977764484544753035433637781874432512215n,
          //   will: BigInt("0xA0088d0e8f748832f220e981Ca928711F87f01D0"),
          //   nonce: 94291489168460372312063129039338610341n as Nonce,
          //   deadline: 4915260772 as Timestamp,
          //   signature: {
          //     r: splitBigInt(
          //       BigInt(
          //         "0xdb8c93bd4da5c30cdff1cbaf071def95a549e1445053c252e0f59c416179123b",
          //       ),
          //     ),
          //     s: splitBigInt(
          //       BigInt(
          //         "0x58c3619e8f41b35c01bc25c17341395629edd459bc8ba534cc82374cb089d695",
          //       ),
          //     ),
          //     v: 27,
          //   } as EcdsaSignature,
          // },
        ];

        for (const {
          testator,
          estates,
          will,
          nonce,
          deadline,
          signature,
        } of testWills) {
          const permitted: TokenPermission[] = estates.map((e) => ({
            token: e.token,
            amount: e.amount,
          }));
          await circuit.expectPass({
            testator,
            permit: [...flattenTokenPermissions(permitted), nonce, deadline],
            will,
            signature: flattenEcdsaSignature(signature),
          });
        }
      },
    );

    it("should reject the verification for invalid permit", async function (): Promise<void> {
      const testWills = [
        {
          testator: BigInt("0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc") - 1n, // invalid testator
          executor: BigInt("0xF85d255D10EbA7Ec5a12724D134420A3C2b8EA3a"),
          estates: [
            {
              beneficiary: BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c"),
              token: BigInt("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"),
              amount: 1000n,
            },
            {
              beneficiary: BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c"),
              token: BigInt("0xb1D4538B4571d411F07960EF2838Ce337FE1E80E"),
              amount: 5000000n,
            },
          ] as Estate[],
          salt: 12694447595861466419244258169335441343265382743954236586072546691080547501349n,
          will: BigInt("0xCfD7d00d14F04c021cB76647ACe8976580B83D54"),
          nonce: 307798376644172688526653206965886192621n as Nonce,
          deadline: 1789652776 as Timestamp,
          signature: {
            r: splitBigInt(
              BigInt(
                "0xe2c3427d586d098f41d41f1a6c45dc61bc47bdf47ea0b74bbacee7e1fdaa8af8",
              ),
            ),
            s: splitBigInt(
              BigInt(
                "0x73434b90e656c5332de72de6e9ede658973947bc497fa4edafd9789de84b38ef",
              ),
            ),
            v: 27,
          } as EcdsaSignature,
        },
        {
          testator: BigInt("0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc"),
          executor: BigInt("0xF85d255D10EbA7Ec5a12724D134420A3C2b8EA3a"),
          estates: [
            {
              beneficiary: BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c"),
              token: BigInt("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d") + 1n, // invalid token
              amount: 1000n,
            },
            {
              beneficiary: BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c"),
              token: BigInt("0xb1D4538B4571d411F07960EF2838Ce337FE1E80E") - 1n, // invalid token
              amount: 5000000n,
            },
          ] as Estate[],
          salt: 12694447595861466419244258169335441343265382743954236586072546691080547501349n,
          will: BigInt("0xCfD7d00d14F04c021cB76647ACe8976580B83D54"),
          nonce: 307798376644172688526653206965886192621n as Nonce,
          deadline: 1789652776 as Timestamp,
          signature: {
            r: splitBigInt(
              BigInt(
                "0xe2c3427d586d098f41d41f1a6c45dc61bc47bdf47ea0b74bbacee7e1fdaa8af8",
              ),
            ),
            s: splitBigInt(
              BigInt(
                "0x73434b90e656c5332de72de6e9ede658973947bc497fa4edafd9789de84b38ef",
              ),
            ),
            v: 27,
          } as EcdsaSignature,
        },
        {
          testator: BigInt("0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc"),
          executor: BigInt("0xF85d255D10EbA7Ec5a12724D134420A3C2b8EA3a"),
          estates: [
            {
              beneficiary: BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c"),
              token: BigInt("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"),
              amount: 1000n - 1n, // invalid amount
            },
            {
              beneficiary: BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c"),
              token: BigInt("0xb1D4538B4571d411F07960EF2838Ce337FE1E80E"),
              amount: 5000000n + 1n, // invalid amount
            },
          ] as Estate[],
          salt: 12694447595861466419244258169335441343265382743954236586072546691080547501349n,
          will: BigInt("0xCfD7d00d14F04c021cB76647ACe8976580B83D54"),
          nonce: 307798376644172688526653206965886192621n as Nonce,
          deadline: 1789652776 as Timestamp,
          signature: {
            r: splitBigInt(
              BigInt(
                "0xe2c3427d586d098f41d41f1a6c45dc61bc47bdf47ea0b74bbacee7e1fdaa8af8",
              ),
            ),
            s: splitBigInt(
              BigInt(
                "0x73434b90e656c5332de72de6e9ede658973947bc497fa4edafd9789de84b38ef",
              ),
            ),
            v: 27,
          } as EcdsaSignature,
        },
        {
          testator: BigInt("0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc"),
          executor: BigInt("0xF85d255D10EbA7Ec5a12724D134420A3C2b8EA3a"),
          estates: [
            {
              beneficiary: BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c"),
              token: BigInt("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"),
              amount: 1000n,
            },
            {
              beneficiary: BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c"),
              token: BigInt("0xb1D4538B4571d411F07960EF2838Ce337FE1E80E"),
              amount: 5000000n,
            },
          ] as Estate[],
          salt: 12694447595861466419244258169335441343265382743954236586072546691080547501349n,
          will: BigInt("0xCfD7d00d14F04c021cB76647ACe8976580B83D54"),
          nonce: 307798376644172688526653206965886192621n as Nonce,
          deadline: (1789652776 - 1) as Timestamp, // invalid deadline
          signature: {
            r: splitBigInt(
              BigInt(
                "0xe2c3427d586d098f41d41f1a6c45dc61bc47bdf47ea0b74bbacee7e1fdaa8af8",
              ),
            ),
            s: splitBigInt(
              BigInt(
                "0x73434b90e656c5332de72de6e9ede658973947bc497fa4edafd9789de84b38ef",
              ),
            ),
            v: 27,
          } as EcdsaSignature,
        },
        {
          testator: BigInt("0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc"),
          executor: BigInt("0xF85d255D10EbA7Ec5a12724D134420A3C2b8EA3a"),
          estates: [
            {
              beneficiary: BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c"),
              token: BigInt("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"),
              amount: 1000n,
            },
            {
              beneficiary: BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c"),
              token: BigInt("0xb1D4538B4571d411F07960EF2838Ce337FE1E80E"),
              amount: 5000000n,
            },
          ] as Estate[],
          salt: 12694447595861466419244258169335441343265382743954236586072546691080547501349n,
          will: BigInt("0xCfD7d00d14F04c021cB76647ACe8976580B83D54"),
          nonce: 307798376644172688526653206965886192621n as Nonce,
          deadline: 1789652776 as Timestamp,
          signature: {
            r: splitBigInt(
              BigInt(
                "0xe2c3427d586d098f41d41f1a6c45dc61bc47bdf47ea0b74bbacee7e1fdaa8af8",
              ),
            ),
            s: splitBigInt(
              BigInt(
                "0x73434b90e656c5332de72de6e9ede658973947bc497fa4edafd9789de84b38ef",
              ),
            ),
            v: 28, // invalid signature
          } as EcdsaSignature,
        },
      ];

      for (const {
        testator,
        estates,
        will,
        nonce,
        deadline,
        signature,
      } of testWills) {
        const permitted: TokenPermission[] = estates.map((e) => ({
          token: e.token,
          amount: e.amount,
        }));
        await circuit.expectFail({
          testator,
          permit: [...flattenTokenPermissions(permitted), nonce, deadline],
          will,
          signature: flattenEcdsaSignature(signature),
        });
      }
    });

    it("should ignore beneficiaries and salt", async function (): Promise<void> {
      const testWills = [
        {
          testator: BigInt("0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc"),
          executor: BigInt("0xF85d255D10EbA7Ec5a12724D134420A3C2b8EA3a"),
          estates: [
            {
              beneficiary:
                BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c") + 1n, // invalid beneficiary
              token: BigInt("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"),
              amount: 1000n,
            },
            {
              beneficiary:
                BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c") - 1n, // invalid beneficiary
              token: BigInt("0xb1D4538B4571d411F07960EF2838Ce337FE1E80E"),
              amount: 5000000n,
            },
          ] as Estate[],
          salt: 0n, // invalid salt
          will: BigInt("0xCfD7d00d14F04c021cB76647ACe8976580B83D54"),
          nonce: 307798376644172688526653206965886192621n as Nonce,
          deadline: 1789652776 as Timestamp,
          signature: {
            r: splitBigInt(
              BigInt(
                "0xe2c3427d586d098f41d41f1a6c45dc61bc47bdf47ea0b74bbacee7e1fdaa8af8",
              ),
            ),
            s: splitBigInt(
              BigInt(
                "0x73434b90e656c5332de72de6e9ede658973947bc497fa4edafd9789de84b38ef",
              ),
            ),
            v: 27,
          } as EcdsaSignature,
        },
      ];

      for (const {
        testator,
        estates,
        will,
        nonce,
        deadline,
        signature,
      } of testWills) {
        const permitted: TokenPermission[] = estates.map((e) => ({
          token: e.token,
          amount: e.amount,
        }));
        await circuit.expectPass({
          testator,
          permit: [...flattenTokenPermissions(permitted), nonce, deadline],
          will,
          signature: flattenEcdsaSignature(signature),
        });
      }
    });
  });
});
