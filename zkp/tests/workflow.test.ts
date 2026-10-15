import * as fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface Groth16Proof {
  proof: object;
  publicSignals: string[];
}

describe("Workflow CLI Tests", () => {
  const circuitName = "multiplier2";
  const circuitDir = `circuits/${circuitName}`;
  const inputDir = `${circuitDir}/inputs`;
  const buildDir = `${circuitDir}/build`;
  const keysDir = `${circuitDir}/keys`;
  const proofsDir = `${circuitDir}/proofs`;
  const contractsDir = `${circuitDir}/contracts`;
  const sharedKeysDir = `circuits/shared/keys/downloaded`;

  const circuitFile = `${circuitDir}/${circuitName}.circom`;
  const r1csFile = `${buildDir}/${circuitName}.r1cs`;
  const wasmFile = `${buildDir}/${circuitName}_js/${circuitName}.wasm`;
  const symFile = `${buildDir}/${circuitName}.sym`;
  const zkeyFile = `${keysDir}/test_${circuitName}_final.zkey`;
  const vkeyFile = `${keysDir}/test_verification_key.json`;
  const proofFile = `${proofsDir}/test_proof.json`;
  const publicFile = `${proofsDir}/test_public.json`;
  const verifierFile = `${circuitDir}/contracts/test_verifier.sol`;

  async function compileCircuit() {
    const { stderr } = await execAsync(
      `circom ${circuitFile} --r1cs --sym --wasm --output ${buildDir} -l node_modules --O2`,
    );
    if (stderr && !stderr.includes("Everything went okay")) {
      console.warn("Compilation warnings:", stderr);
    }
  }

  async function setupTrustedCeremony() {
    const ptauFile = `${sharedKeysDir}/pot12_02.ptau`;
    const ptauUrl =
      "https://pse-trusted-setup-ppot.s3.eu-central-1.amazonaws.com/pot28_0080/ppot_0080_02.ptau";

    try {
      await fs.access(ptauFile);
    } catch {
      await execAsync(`wget -O ${ptauFile} ${ptauUrl}`).catch(() => {
        return execAsync(`curl -o ${ptauFile} ${ptauUrl}`);
      });
    }

    await execAsync(
      `snarkjs groth16 setup ${r1csFile} ${ptauFile} ${zkeyFile}`,
    );

    await execAsync(
      `snarkjs zkey export verificationkey ${zkeyFile} ${vkeyFile}`,
    );
  }

  beforeAll(async () => {
    const dirs = [
      `${inputDir}`,
      `${buildDir}`,
      `${keysDir}`,
      `${proofsDir}`,
      `${contractsDir}`,
      `${sharedKeysDir}`,
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true }).catch(() => {});
    }

    await compileCircuit();
    await setupTrustedCeremony();
  }, 30000); // 30 seconds timeout

  describe("Circuit Compilation", () => {
    it("should have all compiled files", async () => {
      await expect(fs.access(r1csFile)).resolves.not.toThrow();
      await expect(fs.access(wasmFile)).resolves.not.toThrow();
      await expect(fs.access(symFile)).resolves.not.toThrow();
    });

    it("should have correct circuit constraints", async () => {
      const { stdout } = await execAsync(`snarkjs info -r ${r1csFile}`);
      expect(stdout).toContain("# of Constraints: 1");
      expect(stdout).toContain("# of Wires: 4");
    });
  });

  describe("Trusted Setup", () => {
    it("should have generated keys", async () => {
      await expect(fs.access(zkeyFile)).resolves.not.toThrow();
      await expect(fs.access(vkeyFile)).resolves.not.toThrow();
    });

    it("should have valid verification key", async () => {
      const vkeyContent = await fs.readFile(vkeyFile, "utf-8");
      const vkey = JSON.parse(vkeyContent);

      expect(vkey).toHaveProperty("protocol");
      expect(vkey).toHaveProperty("curve");
      expect(vkey).toHaveProperty("nPublic");
      expect(vkey.nPublic).toBe(1);
    });
  });

  describe("Witness Generation", () => {
    it("should complete witness generation within time limit", async () => {
      const start = Date.now();

      const witnessFile = `${buildDir}/witness_perf.wtns`;
      const input = { a: 999999, b: 888888 };

      const inputFile = `${inputDir}/perf_test.json`;
      await fs.writeFile(inputFile, JSON.stringify(input, null, 2));

      await execAsync(
        `snarkjs wtns calculate ${wasmFile} ${inputFile} ${witnessFile}`,
      );

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000);

      await fs.unlink(inputFile);
      await fs.unlink(witnessFile);
    });
  });

  describe("Proof Generation and Verification", () => {
    const ok_message = "OK!";

    async function generateProof(input: {
      a: number;
      b: number;
    }): Promise<Groth16Proof> {
      const inputFile = `${inputDir}/proof_input_${Date.now()}.json`;
      const witnessFile = `${buildDir}/witness_proof.wtns`;

      await fs.writeFile(inputFile, JSON.stringify(input, null, 2));

      await execAsync(
        `snarkjs wtns calculate ${wasmFile} ${inputFile} ${witnessFile}`,
      );

      await execAsync(
        `snarkjs groth16 prove ${zkeyFile} ${witnessFile} ${proofFile} ${publicFile}`,
      );

      const proof = JSON.parse(await fs.readFile(proofFile, "utf-8"));
      const publicSignals = JSON.parse(await fs.readFile(publicFile, "utf-8"));

      await fs.unlink(inputFile);
      await fs.unlink(witnessFile);

      return { proof, publicSignals };
    }

    it("should generate and verify valid proof", async () => {
      const input = { a: 7, b: 8 };
      const proof = await generateProof(input);

      expect(proof.publicSignals[0]).toBe((7 * 8).toString());

      const { stdout } = await execAsync(
        `snarkjs groth16 verify ${vkeyFile} ${publicFile} ${proofFile}`,
      );

      expect(stdout.trim()).toContain(ok_message);

      await fs.unlink(proofFile);
      await fs.unlink(publicFile);
    });

    it("should generate different proofs for different inputs", async () => {
      const input1 = { a: 2, b: 3 };
      const input2 = { a: 4, b: 5 };

      const proof1 = await generateProof(input1);
      const proof2 = await generateProof(input2);

      expect(proof1).not.toEqual(proof2);

      expect(proof1.publicSignals[0]).toBe((2 * 3).toString());
      expect(proof2.publicSignals[0]).toBe((4 * 5).toString());

      await fs.unlink(proofFile);
      await fs.unlink(publicFile);
    });

    it("should complete proof generation within time limit", async () => {
      const start = Date.now();

      const input = { a: 42, b: 24 };
      await generateProof(input);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(30000);

      await fs.unlink(proofFile);
      await fs.unlink(publicFile);
    });
  });

  describe("Solidity Verifier", () => {
    it("should generate Solidity verifier contract", async () => {
      await execAsync(
        `snarkjs zkey export solidityverifier ${zkeyFile} ${verifierFile}`,
      );

      await expect(fs.access(verifierFile)).resolves.not.toThrow();

      const verifierContent = await fs.readFile(verifierFile, "utf-8");
      expect(verifierContent).toContain("contract Groth16Verifier");
      expect(verifierContent).toContain("function verifyProof");

      await fs.unlink(verifierFile);
    });
  });

  afterAll(async () => {
    await fs.unlink(zkeyFile);
    await fs.unlink(vkeyFile);
    await fs.rm(buildDir, { recursive: true, force: true }).catch(() => {});
    await fs.rm(keysDir, { recursive: true, force: true }).catch(() => {});
    await fs.rm(proofsDir, { recursive: true, force: true }).catch(() => {});
    await fs.rm(contractsDir, { recursive: true, force: true }).catch(() => {});
  });
});
