# Circuit soundness audit PoCs (2026-10-17, reviewed at main 57dd489)

These tests are forged-witness and acceptance-set PoCs from an independent review of `cidUpload` and `willCreation`. The review found no witness forgery: someone who does not hold the key cannot make `testator` equal another person's address, and cannot change the decrypted plaintext. The findings below are gaps between what the circuit accepts and what Permit2 can actually execute.

| ID | Finding | Severity | Status | Test |
|----|---------|----------|--------|------|
| H1 | Recovery bit `v` is not bound to the parity of R.y | Low | **Fixed** | `ecdsaAcceptance.test.ts` (H1 tests) |
| H2a | Accepts non-canonical `s + n` | Informational | Won't fix | `ecdsaAcceptance.test.ts` (H2a) |
| H2b | Accepts `r = R.x` with R.x in [n, p) | Informational | Won't fix | `ecdsaAcceptance.test.ts` (H2b) |
| H3 | Signed Permit2 spender (`will`) is never tied to the deployed Will | Low–Medium (liveness) | Won't fix | `willBinding.test.ts` |
| H4 | No key commitment between Phase 1 and Phase 4 | Informational | Won't fix | analysis only |
| — | Public input / key byte range, SBoxOptimized split | — | Negated | `inputRange.test.ts` |

> **Artifacts are stale.** The `cidUpload` circuit sources include the H1 fix: `permitVerify/ecdsaVerify.circom`, plus `verify.yParity === recovery_id` in `RecoverEcdsaPubkey`. The cidUpload zkey, vkey and `CidUploadVerifier` in this repo were **not** regenerated and still match the pre-fix circuit. A deployed verifier therefore still accepts flipped-v proofs until these artifacts are regenerated and the contracts are redeployed. The fix adds 64 constraints and does not change the public signal layout (still 310 signals). `willCreation` is unaffected.

Tests for won't-fix findings record the current behaviour: they assert that the circuit **accepts** the gap case. If one of them is fixed, flip its assertion.

Only the testator can exploit H1–H3. `uploadCid` requires `msg.sender == testator`, and every case needs a signature that is valid under the testator's key. For H2a and H2b, even the testator would need about 2^128 work to produce such a signature.

## H3: why it was not fixed

**Impact.** A testator, or a buggy frontend, can sign a permit whose spender is not the address `createWill` will deploy, which is `CREATE2(testator, executor, estates, salt)`. Every phase still verifies. The failure only appears when `Will.signatureTransferToBeneficiaries` reverts inside Permit2, which happens after the testator's death. This is a liveness problem.

**Out of scope: a compromised frontend.** A compromised frontend can get the testator to sign a Permit2 permit for an attacker-controlled spender, then exfiltrate the signature and call Permit2 directly. That theft never touches WillFactory or the circuits, so no circuit or contract check can prevent it.

**Options considered**

- **A. Check the spender at `createWill`.** `cidUpload` outputs the spender, and `createWill` requires the CREATE2 prediction to equal it. This is cheap, but it only catches the mismatch after death, so its value is marginal. It also needs new pubSignals indices and a regenerated verifier.
- **B. Recommended long-term fix: make the Will address independent of private data.**
  - Use a CREATE2 salt derived from public data, e.g. `keccak(testator, cid)`, and constant init args.
  - Have the factory call `initialize(testator, executor, estates)` atomically after deployment.
  - `uploadCid` can then compute the expected address while the testator is alive and reject a mismatching spender.
  - Constraint cost is negligible: one extra public output.
  - Trade-off: the estates would be bound to the permit only through Phase 4 decrypting the same plaintext, i.e. the AES argument used for H4, rather than through CREATE2.
- **C. Compute CREATE2 in-circuit in Phase 1.** Absorb the 22 full Keccak blocks of the 3,023-byte creation code offline into a constant state, then hash only the tail, the init args and the CREATE2 preimage in-circuit. Estimated cost is about +1M constraints. This ties the circuit to the Will bytecode and to the factory and Permit2 addresses.

Under A and C, binding the spender also binds the executor, beneficiaries, tokens, amounts and salt to the Phase 1 signature, assuming a 160-bit CREATE2 second preimage is infeasible. It also closes H4. `permit.permitted[i]` and `estates[i]` come from the same plaintext in `cidUpload`, and the Will rebuilds `permitted` in the same order, so no extra check is needed.

## H4: why it is not exploitable

Phase 1 and Phase 4 are bound only through the CID, which fixes `iv` and the ciphertext, and through the `testator` field. To use another key K' in Phase 4, an attacker would need its CTR keystream to make `testator` match and make `executor` equal an address they control. That is more than 320 bits of keystream control, while AES-256 has only 2^256 keys, so such a K' almost certainly does not exist. If this ever needs a hard guarantee, have both circuits output a commitment to the key, e.g. `Poseidon(key)`.

## Not covered by this review

- Range and carry bounds inside the 0xPARC bigint/secp256k1 code. It is semantically identical to circom-ecdsa d87eb70 and is trusted as upstream.
- Correctness of the circom compiler and its O2 simplification.
- Trusted setup. Phase 2 has a single contributor. That is a trust assumption, and a multi-party ceremony is needed before production.
- Contract logic beyond the pubSignals layout.
- Frontend witness generation.
- Base64, UTF-8 and GCM. They are not in the top-level include graph.
