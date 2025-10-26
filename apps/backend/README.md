# Backend Usage Guide

This guide explains how to use the backend components of the Will system for encrypting, uploading, and managing will files.

## Two Usage Modes

The backend can be used in two ways:

### 1. **API Server Mode** (For Frontend Integration)

The backend provides an Express API server that the frontend uses for computationally intensive operations like ZKP proof generation.

**Start the API server:**

```bash
pnpm dev
```

This starts the server on the port specified in `.env` (default: 3001).

**Available Endpoints:**

- `POST /api/zkp/cidUpload` - Generate ZKP proof for CID upload verification
- `POST /api/zkp/willCreation` - Generate ZKP proof for will creation verification

**Request Body Format:**

```json
{
  "ciphertext": [/* array of numbers */],
  "key": [/* array of numbers */],
  "iv": [/* array of numbers */]
}
```

**Response Format:**

```json
{
  "proof": {
    "pi_a": ["...", "..."],
    "pi_b": [["...", "..."], ["...", "..."]],
    "pi_c": ["...", "..."],
    "protocol": "groth16",
    "curve": "bn128"
  },
  "publicSignals": ["..."]
}
```

### 2. **CLI Mode** (For Testing & Manual Operations)

Use Make commands to run the complete workflow manually. This is useful for testing, development, and understanding the system flow.

## Workflow Overview

The system follows a four-phase workflow with distinct roles:

1. **Phase 1 - Testator**: Encrypts and uploads the will to IPFS, then uploads the CID to WillFactory
2. **Phase 2 - Notary**: Notarizes the CID in WillFactory to establish legal validity
3. **Phase 3 - Oracle**: Probates the CID in WillFactory after confirming testator's death
4. **Phase 4 - Executor**: Creates the Will contract and executes asset transfers

## Prerequisites

1. **Environment Configuration**: Ensure the `.env` file is properly configured with all required variables.
2. **IPFS Daemon**: Start the IPFS daemon for file storage operations (for CLI mode).

## Initialization

Reset environment variables and remove old will files:

```sh
make clean
```

## Phase 1: Testator - Encrypt & Upload Will

**Role**: Testator
**Goal**: Create, encrypt, and upload the encrypted will to IPFS, then register the CID in WillFactory

### Step 1: Create Will Content

Store the will in [`will/1_plaintext.txt`](will/1_plaintext.txt).

The will should contain:

- [ ] The testator's wallet address
- [ ] The executor's wallet address
- [ ] The beneficiary's wallet address (multiple beneficiaries support planned)
- [ ] ERC20 tokens and corresponding amounts to be transferred

**Example will:**

```
After my death, I would like to transfer 1000 USDC and 5000000 LINK to my son.
My wallet is 0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc.
My son's wallet 0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c.
I would like to assign 0xF85d255D10EbA7Ec5a12724D134420A3C2b8EA3a as the executor.
```

### Step 2: Format Will

Format the plaintext will into a JSON file:

- **Required `.env` fields**: None
- **Output**: [`will/2_formatted.json`](will/2_formatted.json)

_Note: This step is currently under development._

### Step 3: Approve Permit2 Contract

One-time initialization to approve the Permit2 contract for the testator's tokens:

```sh
make approve-permit2
```

- **Note**: If you've completed this approval before, you can skip to the next step.

### Step 4: Predict Will Address

Generate the will contract address based on the formatted will:

```sh
make predict-address
```

- **Output**: [`will/3_addressed.json`](will/3_addressed.json)
- **Updates**: The following `.env` variables are automatically updated:
  - `SALT`, `WILL`
  - `BENEFICIARY<ID>`, `TOKEN<ID>`, `AMOUNT<ID>`

### Step 5: Generate Permit2 Signature

Create the signature for [Permit2 SignatureTransfer function](https://docs.uniswap.org/contracts/permit2/reference/signature-transfer):

```sh
make sign-permit
```

- **Output**: [`will/4_signed.json`](will/4_signed.json)
- **Updates**: The following `.env` variables are automatically updated:
  - `NONCE`, `DEADLINE`, `PERMIT2_SIGNATURE`

### Step 6: Serialize Will

Serialize the signed will:

```sh
make serialize-will
```

- **Output**: [`will/5_serialized.json`](will/5_serialized.json)

### Step 7: Encrypt Will

Encrypt the serialized will with a randomly generated secret key:

```sh
make encrypt-will
```

- **Output**: [`will/6_encrypted.json`](will/6_encrypted.json) (base64 encoded)

### Step 8: Generate CID Upload Proof

Generate the zero-knowledge proof for CID upload verification:

```sh
make prove-for-cid-upload
```

- **Output**: ZKP proof files in the zkp directory
- **Purpose**: Proves knowledge of the encryption key without revealing it

### Step 9: Upload to IPFS

Upload the encrypted will to IPFS:

```sh
make upload-will
```

- **Updates**: The following `.env` variables are automatically updated:
  - `CID` (IPFS Content Identifier)

### Step 10: Upload CID

Upload the CID to `willFactory.sol`:

```sh
make upload-cid
```

- **Updates**: The following `.env` variables are automatically updated:
  - `UPLOAD_TX_HASH`, `UPLOAD_TIMESTAMP`

## Phase 2: Notary - Notarization

**Role**: Notary
**Goal**: Verify and notarize the CID in WillFactory to establish legal validity

### Step 1: Notarize CID

The notary notarizes the uploaded CID in `WillFactory.sol`:

```sh
make notarize-cid
```

- **Updates**: The following `.env` variables are automatically updated:
  - `NOTARIZE_TX_HASH`, `NOTARIZE_TIMESTAMP`

## Phase 3: Oracle - Probation

**Role**: Oracle
**Goal**: Authorize will execution by probating the CID in WillFactory after confirming testator's death

### Step 1: Probate CID

After verifying death confirmation data from an authoritative source, the oracle probates the CID in `WillFactory.sol` to authorize will creation:

```sh
make probate-cid
```

- **Required `.env` fields**: `ORACLE_PRIVATE_KEY`, `WILL_FACTORY`, `CID`
- **Updates**: The following `.env` variables are automatically updated:
  - `PROBATE_WILL_TX_HASH`, `PROBATE_WILL_TIMESTAMP`

## Phase 4: Executor - Create Will & Transfer Estates

**Role**: Executor
**Goal**: Download and decrypt the will, create the Will contract, and execute asset transfers to beneficiaries

### Step 1: Download Will from IPFS

Download the encrypted will from IPFS using the CID:

```sh
make download-will
```

- **Output**: [`will/7_downloaded.json`](will/7_downloaded.json)

### Step 2: Decrypt Will

Decrypt the downloaded will using the secret key:

```sh
make decrypt-will
```

- **Required**: Secret key (provided by testator through secure channel)
- **Output**: [`will/8_decrypted.json`](will/8_decrypted.json)

### Step 3: Deserialize Will

Deserialize the decrypted will to extract will data:

```sh
make deserialize-will
```

- **Output**: [`will/9_deserialized.json`](will/9_deserialized.json)

### Step 4: Generate Will Creation Proof

Generate the zero-knowledge proof for will creation verification:

```sh
make prove-for-will-creation
```

- **Output**: ZKP proof files in the zkp directory
- **Purpose**: Proves knowledge of the encryption key and will contents

### Step 5: Create Will Contract

Deploy a new `Will.sol` contract through `WillFactory.sol` using CREATE2:

```sh
make create-will
```

- **Note**: This step can only succeed after the CID has been probated by the oracle
- **Updates**: The following `.env` variables are automatically updated:
  - `CREATE_WILL_TX_HASH`, `CREATE_WILL_TIMESTAMP`

### Step 6: Transfer Estates to Beneficiaries

Execute the Will contract to transfer assets from testator to beneficiaries using Permit2:

```sh
make signature-transfer
```

- **Action**: Calls `signatureTransferToBeneficiaries()` in `Will.sol`, which invokes Permit2 to transfer tokens
- **Updates**: The following `.env` variables are automatically updated:
  - `EXECUTE_WILL_TX_HASH`, `EXECUTE_WILL_TIMESTAMP`

## Complete Workflow Summary

To run the entire workflow in sequence:

```sh
make all
```

This command executes all four phases in order:

1. `testatorUploadsEncryptedWill` - Phase 1 (Testator)
2. `notarySignsCid` - Phase 2 (Notary)
3. `oracleProbateCid` - Phase 3 (Oracle)
4. `executorTransfersEstates` - Phase 4 (Executor)

**Important Dependencies**:

- Notarization requires the CID to be uploaded first
- Probation requires the CID to be notarized first (cannot happen in the same block)
- Will creation requires the CID to be probated first (cannot happen in the same block)
- Estate transfer requires the Will contract to be created first

## File Structure

The will processing creates the following files in sequence:

```
will/
├── 1_plaintext.txt      # Original will content
├── 2_formatted.json     # Structured JSON format
├── 3_addressed.json     # Will with contract address
├── 4_signed.json        # Will with Permit2 signature
├── 5_serialized.json    # Serialized will
├── 6_encrypted.json     # Encrypted will (base64)
├── 7_downloaded.json    # Downloaded will from IPFS
├── 8_decrypted.json     # Decrypted will
└── 9_deserialized.json  # Deserialized will
```
