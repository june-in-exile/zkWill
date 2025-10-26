# Frontend Application

React + TypeScript + Vite frontend for the Web3 Will System using a **hybrid architecture** that combines client-side wallet operations with server-side heavy computations.

## Architecture Overview (Hybrid Approach)

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Browser)                   │
│                                                         │
│  ┌─────────────────────┐     ┌─────────────────────┐    │
│  │  MetaMask Wallet    │     │  Backend API        │    │
│  │  (User Controls)    │     │  (Heavy Compute)    │    │
│  ├─────────────────────┤     ├─────────────────────┤    │
│  │ • Sign Transactions │     │ • Encryption        │    │
│  │ • Token Approval    │     │ • Serialization     │    │
│  │ • Permit2 Signature │     │ • ZKP Generation    │    │
│  │ • Send Transactions │     │ • Salt Generation   │    │
│  └─────────────────────┘     └─────────────────────┘    │
│           ↓                            ↓                │
│  ┌───────────────────────────────────────────────────┐  │
│  │           Frontend Components                     │  │
│  │  • CreateWillForm  • ApprovePermit2Step           │  │
│  │  • EncryptStep     • UploadIPFSStep               │  │
│  │  • SubmitCIDStep   • ExecutorPage                 │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                         ↓
                 Arbitrum Sepolia
```

## Role-Based Interfaces

### Testator

- Create will with beneficiaries and asset distribution
- Approve ERC20 tokens for Permit2 (MetaMask)
- Sign Permit2 signature for transfers (MetaMask)
- Encrypt will via backend API (AES-256-GCM)
- Upload encrypted will to IPFS (browser Helia)
- Generate ZKP proof via backend API
- Submit CID to WillFactory contract (MetaMask)

### Notary

- View pending uploaded wills
- Notarize CIDs to establish legal validity
- Track notarization history

### Oracle

- View notarized wills
- Probate wills after death confirmation
- Authorize executor to proceed

### Executor

- Download encrypted will from IPFS
- Decrypt will via backend API
- Generate ZKP proof via backend API
- Create Will contract via WillFactory (MetaMask)
- Execute asset transfers to beneficiaries (MetaMask)

## Development

### Prerequisites

- Node.js 18+
- npm or pnpm
- MetaMask wallet
- **Backend server running** (see `apps/backend` - required for encryption & ZKP)

### Environment Configuration

Create `.env` in `apps/frontend/`:

```env
# Network Configuration
VITE_CHAIN_ID=421614
VITE_RPC_URL=https://arb-sepolia.g.alchemy.com/v2/YOUR_KEY
VITE_NETWORK_NAME=Arbitrum Sepolia
VITE_CURRENCY_SYMBOL=ETH
VITE_BLOCK_EXPLORER=https://sepolia.arbiscan.io

# Backend API
VITE_BACKEND_URL=http://localhost:3001

# Contract Addresses (deployed on Arbitrum Sepolia)
VITE_PERMIT2=0x000000000022D473030F116dDEE9F6B43aC78BA3
VITE_WILL_FACTORY=<your_deployed_factory>
VITE_CID_UPLOAD_VERIFIER=<your_deployed_verifier>
VITE_WILL_CREATION_VERIFIER=<your_deployed_verifier>
VITE_JSON_CID_VERIFIER=<your_deployed_verifier>
```

## Zero-Knowledge Proof Generation (Demo vs Production)

⚠️ **This is a Demo Implementation**

For demonstration purposes, this frontend **delegates ZKP proof generation to a backend API server** instead of generating proofs in the browser. This avoids downloading multi-GB circuit files (e.g., 3.5 GB for cidUpload) and provides better performance.

**Current Architecture:**

```
Frontend (Browser)
  ↓ (encrypted inputs)
Backend API Server
  ↓ (generates proof using snarkjs CLI)
Frontend (Browser)
  ↓ (proof + public signals)
Blockchain (Smart Contract)
```

**Production Recommendation:**

In a production environment, **proof generation should be outsourced to trusted external nodes**, such as:

1. **TEE (Trusted Execution Environment)**:
   - Service providers can offer proof generation in hardware-isolated environments (e.g., Intel SGX, AMD SEV, ARM TrustZone)
   - Guarantees computation integrity without exposing private inputs
   - Much faster than browser-based generation

2. **Decentralized Proof Networks**:
   - Use dedicated proof generation services (e.g., Marlin, RISC Zero)
   - Distribute computational load across multiple nodes

3. **Backend Proof Service with TEE**:
   - Replace the demo backend with a TEE-based proof generation service
   - User submits encrypted inputs to a TEE node
   - TEE generates proof securely and returns it to the client
   - Client verifies and submits to blockchain
