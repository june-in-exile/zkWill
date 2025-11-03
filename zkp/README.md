# Zero-Knowledge Proof Circuits

This directory contains multiple Circom circuit implementations for the **ZK Will System**, supporting a complete ZK-SNARK workflow from circuit compilation to smart contract deployment. The project focuses on privacy-preserving functionality for digital estate management.

## 🎯 Project Overview

This ZKP module is a core component of the Web3 will management system, implementing two main circuits that enable privacy-preserving will management:

### Main Circuits

| Circuit                | Scenario                                                                                                          | Components                                                                                                                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **uploadCid Circuit**  | Testator uploads encrypted will to IPFS and proves its validity to the blockchain without revealing will content. | 1. **Decryption**: Decrypt ciphertext (public) to plaintext (private)<br>2. **Permit2 signature verification**: Validate permit2 signature (private) within the decrypted content |
| **createWill Circuit** | After testator's death, executor creates will contract with verified decryption.                                  | 1. **Decryption**: Decrypt ciphertext (public) to plaintext (public)<br>                                                                                                          |

### Shared Infrastructure

- **Modular design**: Shared components (e.g., the AES circuits) in [`circuits/shared/components/`](./circuits/shared/components/)
- **Circuit-specific logic**: Custom components in respective `circuits/{circuitName}/components/` directories

## 📋 Prerequisites

```bash
# Install circom
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
source ~/.cargo/env
git clone https://github.com/iden3/circom.git
cd circom
cargo build --release
cargo install --path circom

# Node.js (v18+ recommended)
# pnpm (package manager used by this project)
```

## 🚀 Quick Start

### Install Dependencies

```bash
pnpm install
```

### Setup Powers of Tau (shared across all circuits)

```bash
# Download existing Powers of Tau (recommended)
make trusted-setup-phase1-download

# Or generate new Powers of Tau
make trusted-setup-phase1
```

### Run the Demo

Run the complete workflow using the default circuit (`multiplier2`):

```bash
make circuit
```

Or run individual steps:

```bash
make compile                    # Compile Circuit
make witness                    # Generate Witness
make trusted-setup-phase2       # Circuit-Specific Trusted Setup
make prove                      # Generate Proof
make verify                     # Verify Proof
make solidity                   # Generate Solidity Verifier Contract
make generate-call              # Generate Smart Contract Call Parameters
```

### For Specific Circuits

Run the workflow for different circuits:

```bash
make <command> CIRCUIT=createWill
make <command> CIRCUIT=uploadCid
```

### Testing

```bash
# Test current circuit
make test

# Test specific circuit
make test CIRCUIT=multiplier2

# Test all circuits
make test-circuits

# Test AES-256-GCM logics and all circuits
make test-all
```

### Clean Up

```bash
# Clean current circuit
make clean

# Clean all circuits
make clean-all
```

### Adding New Circuits

1. Create a new directory under `circuits/`
2. Add the `.circom` circuit file
3. Add the `inputs/example.json` input file
4. Run the workflow:

   ```bash
   make circuit CIRCUIT=your_new_circuit
   ```

## 📖 Makefile Usage Guide

### Available Commands

To see all available commands:

```bash
make help
```

### Circuit Management

The Makefile operates on a default circuit (currently `multiplier2`), but you can specify any circuit:

```bash
# Use default circuit
make compile

# Use specific circuit
make compile CIRCUIT=createWill
```

### Key Makefile Variables

- `CIRCUIT`: Target circuit name (default: `multiplier2`)
- `TEMPLATE`: Circuit template name (default: `Multiplier2`)
- `PTAU_PATH`: Path to Powers of Tau file

### Project Status

Check the current status of all circuits:

```bash
make status
```

This shows compilation status, key generation, and verifier contract status for each circuit.

## Generated Files

### Directory Structure Created

```bash
circuits/<CIRCUIT>/
├── build/          # Compiled artifacts (.r1cs, .wasm, .sym)
├── inputs/         # Input files (example.json)
├── keys/           # Circuit keys and verification key
├── proofs/         # Generated proofs and public signals
└── contracts/      # Solidity verifier contracts
```

### Compilation Artifacts

- `<circuit>.r1cs` - R1CS constraint system
- `<circuit>.wasm` - WebAssembly compiled circuit
- `<circuit>.sym` - Symbol file
- `<circuit>_js/` - JavaScript witness generator

### Key Files

- `<ptau>.ptau` - Powers of Tau (shared)
- `<circuit>_0000.zkey` - Initial circuit key
- `<circuit>_0001.zkey` - Final circuit key
- `verification_key.json` - Verification key

### Proof Related

- `witness.wtns` - Witness file
- `proof.json` - ZK proof
- `public.json` - Public signals

### Input/Output

- `example.json` - Input example
- `verifier.sol` - Solidity verifier contract

## 🔬 Testing Framework

The project includes comprehensive testing using Jest and TypeScript:

```bash
tests/
├── config/          # Configuration handling
├── logic/           # Logics of the circuit
├── type/            # Data type in logics
├── util/            # Testing utilities and setup
├── <circuit>.test.ts # Individual circuit tests
└── workflow.test.ts  # E2E workflow tests
```

## References

### Zero-Knowledge Proof

- [Circom 2 Documentation](https://docs.circom.io/getting-started/installation/)
- [SnarkJS Documentation](https://github.com/iden3/snarkjs)
- [Groth16 Protocol](https://eprint.iacr.org/2016/260.pdf)
- [Powers of Tau Ceremony](https://github.com/privacy-scaling-explorations/perpetualpowersoftau)

### AES-256-GCM

- [NIST FIPS 197](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.197-upd1.pdf)
- [NIST SP 800-38A](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38a.pdf)
- [NIST SP 800-38D](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf)

### Keccak-256

- [NIST FIPS 202](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.202.pdf)
- [TeamKeccak](https://keccak.team/keccak_specs_summary.html)
- [NIST Examples with Intermediate Values](https://csrc.nist.gov/projects/cryptographic-standards-and-guidelines/example-values)
- [keccak256-circom](https://github.com/vocdoni/keccak256-circom)

### ECDSA

- [circom-ecdsa](https://github.com/0xPARC/circom-ecdsa)
