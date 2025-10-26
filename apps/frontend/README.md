# Frontend Application

React + TypeScript + Vite frontend for the Web3 Will System.

## Features

### Role-Based Interfaces

#### Testator

- Create will with beneficiaries and asset distribution
- Encrypt will with AES-256-CTR (Web Crypto API)
- Generate zero-knowledge proof for CID upload
- Upload encrypted will to IPFS (Helia)
- Submit CID to WillFactory contract

#### Notary

- View pending uploaded wills
- Notarize CIDs to establish legal validity
- Track notarization history

#### Oracle

- View notarized wills
- Probate wills after death confirmation
- Authorize executor to proceed

#### Executor

- Download encrypted will from IPFS
- Decrypt will with provided key
- Generate zero-knowledge proof for will creation
- Create Will contract via WillFactory
- Execute asset transfers to beneficiaries

### Technical Features

- **Wallet Integration**: MetaMask and Web3 wallet support via ethers.js
- **Client-Side Encryption**: Web Crypto API for AES-256-CTR encryption
- **IPFS Storage**: Helia for browser-based IPFS operations
- **Zero-Knowledge Proofs**: Backend API for proof generation (see backend server)
- **Smart Contract Interaction**: Direct blockchain interactions from frontend

## Project Structure

```
src/
├── components/
│   ├── wallet/          # Wallet connection
│   ├── common/          # Shared components (Layout, etc.)
│   ├── contract/        # Contract interaction components
│   ├── crypto/          # Crypto-related components
│   ├── ipfs/            # IPFS components
│   └── zkp/             # ZKP components
├── pages/
│   ├── HomePage.tsx     # Landing page
│   ├── testator/        # Testator interface
│   ├── notary/          # Notary interface
│   ├── oracle/          # Oracle interface
│   └── executor/        # Executor interface
├── utils/
│   ├── cryptography/    # Crypto utilities (Web Crypto API)
│   ├── ipfs/            # IPFS utilities (Helia)
│   ├── contract/        # Contract interaction utilities
│   └── zkp/             # ZKP API client (calls backend)
├── hooks/
│   └── useWallet.ts     # Wallet connection hook
├── types/
│   └── global.d.ts      # TypeScript type definitions
└── styles/
    └── index.css        # Global styles
```

## Development

### Prerequisites

- Node.js 18+
- pnpm
- MetaMask or compatible Web3 wallet
- **Backend server running** (see `apps/backend` directory)

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The app will be available at http://localhost:5173

**Important**: Make sure the backend server is running on the configured port (default: 3001) for ZKP proof generation to work.

### Build

```bash
pnpm build
```

### Lint

```bash
pnpm lint
```

## Backend Dependency

This frontend requires the **backend API server** to be running for zero-knowledge proof generation.

The backend handles computationally intensive ZKP generation, avoiding multi-GB circuit file downloads in the browser. See the `apps/backend` directory for setup instructions.

**Backend Configuration:**

The backend URL is configured via the `BACKEND_PORT` environment variable in the root `.env` file (default: 3001).

## Important Notes

### Zero-Knowledge Proof Generation (Demo vs Production)

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

**Recommended Architecture for Production:**

```
User (Frontend)
  ↓ (encrypted inputs)
TEE Node / Decentralized Proof Service
  ↓ (ZKP proof generated in isolated environment)
User (Frontend)
  ↓ (proof + public signals)
Blockchain (Smart Contract)
```

The current implementation provides a foundation for this architecture, where the backend server can be replaced with a TEE-based service for production use.

### Security Considerations

1. **Encryption Keys**: When the testator encrypts a will, the key is downloaded as a file. This key must be securely transmitted to the executor off-chain.

2. **IPFS Storage**: This demo uses local Helia nodes. Files are stored temporarily and may not persist across sessions. In production, use pinning services or decentralized storage solutions.

3. **Private Keys**: Never store private keys in the frontend code or local storage. Always use wallet providers like MetaMask.

### Browser Compatibility

- Modern browsers with Web Crypto API support
- MetaMask or compatible Web3 wallet extension

### Known Limitations

- Requires backend server for ZKP generation (see `apps/backend`)
- IPFS files are not pinned permanently (local Helia storage)
- Mock data for pending/notarized wills (TODO: fetch from contract events)