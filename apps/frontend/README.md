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
- **Zero-Knowledge Proofs**: snarkjs for in-browser proof generation (demo only)
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
│   └── zkp/             # ZKP generation (snarkjs)
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

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The app will be available at http://localhost:5173

### Build

```bash
pnpm build
```

### Lint

```bash
pnpm lint
```

## ZKP Circuit Files

For ZKP proof generation to work, you need to place the compiled circuit files in the `public/zkp/` directory:

```
public/
└── zkp/
    ├── willCreation/
    │   ├── willCreation.wasm
    │   ├── willCreation_0001.zkey
    │   └── verification_key.json
    └── cidUpload/
        ├── cidUpload.wasm
        ├── cidUpload_0001.zkey
        └── verification_key.json
```

These files should be copied from the `zkp/circuits/` directory after running circuit compilation.

## Important Notes

### Zero-Knowledge Proof Generation (Demo vs Production)

⚠️ **This is a Demo Implementation**

For demonstration purposes, this frontend generates zero-knowledge proofs **directly in the browser** using snarkjs. This approach has several limitations:

**Demo Limitations:**

- **Performance**: Proof generation can take 5-15 minutes and freezes the browser UI
- **Memory**: Requires significant RAM (2GB+ recommended)
- **User Experience**: Browser becomes unresponsive during proof generation
- **Security**: Client-side computation exposes circuit details

**Production Recommendation:**

In a production environment, **proof generation should be outsourced to trusted external nodes**, such as:

1. **TEE (Trusted Execution Environment)**:
   - Service providers can offer proof generation in hardware-isolated environments (e.g., Intel SGX, AMD SEV, ARM TrustZone)
   - Guarantees computation integrity without exposing private inputs
   - Much faster than browser-based generation

2. **Decentralized Proof Networks**:
   - Use dedicated proof generation services (e.g., Marlin, RISC Zero)
   - Distribute computational load across multiple nodes

3. **Backend Proof Service**:
   - User submits encrypted inputs to a trusted backend
   - Backend generates proof and returns it to the client
   - Client verifies and submits to blockchain

**Recommended Architecture for Production:**

```
User (Frontend)
  ↓ (encrypted inputs)
TEE Node / Proof Service
  ↓ (ZKP proof)
User (Frontend)
  ↓ (proof + public signals)
Blockchain (Smart Contract)
```

This approach maintains privacy while providing better performance and user experience.

### Security Considerations

1. **Encryption Keys**: When the testator encrypts a will, the key is downloaded as a file. This key must be securely transmitted to the executor off-chain.

2. **IPFS Storage**: This demo uses local Helia nodes. Files are stored temporarily and may not persist across sessions. In production, use pinning services or decentralized storage solutions.

3. **Private Keys**: Never store private keys in the frontend code or local storage. Always use wallet providers like MetaMask.

### Browser Compatibility

- Modern browsers with Web Crypto API support
- MetaMask or compatible Web3 wallet extension
- Sufficient memory for ZKP operations (2GB+ recommended)

### Known Limitations

- ZKP generation runs on main thread (blocks UI)
- IPFS files are not pinned permanently
- No contract addresses configured (TODO)
- Mock data for pending/notarized wills (TODO: fetch from contract)

## Future Improvements

- [ ] Implement Web Workers for better UI responsiveness
- [ ] Add contract interaction logic
