# Web3 Will System

A blockchain-based inheritance management framework that leverages Permit2, CREATE2, Zero-Knowledge Proofs (ZKP), and IPFS to securely handle the creation, notarization, and execution of on-chain wills.

## System Overview

The system follows a multi-role collaboration model involving four key participants: Testator, Executor, Notary, and Oracle. Each role operates within a distinct stage of the process—creation, notarization, activation, and execution—ensuring that every step of the digital will lifecycle is verifiable, secure, and privacy-preserving.

By combining decentralized storage (IPFS), verifiable computation (ZKPs), programmable inheritance logic (smart contracts with CREATE2), and trustless authorization (Permit2), the system provides a transparent yet confidential method to manage digital wills and asset transfers on the blockchain.

### 1. Will Creation (Testator)

The Testator begins by approving the maximum token allowance to the Permit2 contract, preparing for future authorized asset transfers. Through the system interface, the Testator inputs the will content, after which the system performs the following steps:

- Generates a Permit2 signature to authorize future token transfers
- Serializes and encrypts the will, producing an **Encrypted Will**
- Locally generates a **CID Upload Zero-Knowledge Proof (ZKP)** to prove the validity and structure of the uploaded content without revealing the plaintext
- Uploads the encrypted will to IPFS, obtains the corresponding Content Identifier (CID), and submits both the CID and ZKP to the `uploadCid` function of `WillFactory.sol`

### 2. Notarization (Notary)

Once the will is uploaded, the Notary calls the `notarizeCid` function in `WillFactory.sol` to notarize the corresponding CID. This ensures that the encrypted will has been verified and witnessed by a trusted party, establishing legal validity and preventing unauthorized uploads.

### 3. Activation (Oracle)

Before the Testator's death, the encrypted will remains inaccessible and cannot be instantiated or executed. When the Oracle receives verifiable death confirmation data from an authoritative source (such as a government registry or medical attestation), it calls `WillFactory.sol` (e.g., `authorizeExecution`) to confirm that the Testator has passed away. This authorization enables the Executor to proceed with will creation and execution, ensuring that the process only begins under legitimate conditions.

### 4. Will Creation and Execution (Executor)

After receiving authorization from the Oracle, the Executor retrieves the Encrypted Will from IPFS using the stored CID. With access to the decryption key (provided by the Testator; key transmission and custody details are outside the system's scope), the Executor decrypts and deserializes the will. The Executor then:

- Generates a **Will Creation ZKP**, proving that the decrypted content matches the previously uploaded version and adheres to the required format
- Calls the `createWill` function in `WillFactory.sol` to deploy a verified `Will.sol` contract instance on-chain
- Executes the `signatureTransferToBeneficiaries` function in `Will.sol`, which internally calls the Permit2 contract to automatically and securely transfer the Testator's assets to the designated beneficiaries according to the signed authorization

## 🏗️ Project Architecture

```
will-project/
├── apps/
│   ├── frontend/          # React + Vite frontend application
│   └── backend/           # Node.js + Express backend API
├── contracts/             # Foundry smart contracts
├── zkp/                   # Circom zero-knowledge proofs
├── shared/                # Shared code (types, utilities, constants)
└── package.json           # Root dependency management
```

## 🚀 Quick Start

### Prerequisites

Ensure you have the following tools installed:

- **Node.js** (v18+)
- **pnpm** (recommended package manager)
- **Foundry** (Solidity development toolkit)
- **Circom** (Zero-knowledge circuit compiler)

```bash
# Install pnpm
npm install -g pnpm

# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install Circom (macOS)
brew install circom
```

### Installation and Setup

1. **Clone the repository**

```bash
git clone https://github.com/june-in-exile/will.git
cd will
```

2. **Install dependencies & generate ZKP & build smart contracts**

```bash
pnpm install
pnpm build
```

3. **Start development environment**

```bash
# Start both frontend and backend
pnpm dev

# Or start separately
pnpm dev:frontend  # http://localhost:5173
pnpm dev:backend   # http://localhost:3001
```

## 📝 Available Commands

### Development Commands

```bash
# Development mode
pnpm dev                  # Start both frontend and backend
pnpm dev:frontend         # Start frontend only (Vite)
pnpm dev:backend          # Start backend only (Node.js)

# Build
pnpm build                # Build all modules
pnpm build:frontend       # Build frontend
pnpm build:backend        # Build backend
pnpm build:contracts      # Compile smart contracts

# Code quality
pnpm type-check            # TypeScript type checking
pnpm lint                 # ESLint code checking
pnpm lint --fix           # Auto-fix ESLint issues
pnpm format               # Prettier formatting

# Cleanup
pnpm clean                # Clean all build artifacts
```

### Dependency Management

```bash
# Check outdated dependencies
pnpm deps:check

# Update all dependencies to latest versions
pnpm deps:update

# Security audit
pnpm deps:audit

# Clean and reinstall dependencies
pnpm deps:clean
```

## 🔧 Project Configuration

### Environment Variables

Copy the `.env.example` file as `.env`:

```bash
cp .env.example .env
```

Fill in the fields required to interact with the contracts:

```bash
ARB_SEPOLIA_RPC_URL=https://arb-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
ARBSCAN_API_KEY=YOUR_ARBSCAN_API_KEY

EXECUTOR=0x_YOUR_EXECUTOR_ADDRESS
EXECUTOR_PRIVATE_KEY=YOUR_EXECUTOR_PRIVATE_KEY_WITHOUT_0X

TESTATOR=0x_YOUR_TESTATOR_ADDRESS
TESTATOR_PRIVATE_KEY=YOUR_TESTATOR_PRIVATE_KEY_WITHOUT_0X
```

**Note on IPFS**: This project uses a local Helia instance for IPFS storage. No external service configuration is required. Files are stored temporarily for demo purposes.

The other fields would be automatically updated during the execution.

## 🏗️ System Architecture

### Frontend (React + Vite)

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: CSS Modules
- **State Management**: React Hooks
- **Web3 Integration**: ethers.js + Permit2 SDK

### Backend (Node.js + Express)

- **Runtime**: Node.js (ESM)
- **Framework**: Express
- **Language**: TypeScript
- **Encryption**: Symmetric encryption + Zero-knowledge proofs
- **Storage**: IPFS (Helia local node)

### Smart Contracts (Solidity + Foundry)

- **Development Framework**: Foundry
- **Testing**: Forge
- **Deployment**: Forge Script
- **Features**: CREATE2, Permit2 integration

### Zero-Knowledge Proofs (Circom)

- **Circuit Language**: Circom
- **Proving System**: Groth16
- **Purpose**: Private content verification and format validation

## 🚨 Troubleshooting

### Common Issues

1. **TypeScript module resolution errors**

```bash
# Clean and reinstall
pnpm clean
pnpm install
```

2. **ESLint parsing errors**

```bash
# Check ESLint configuration
pnpm lint --debug
```

3. **Smart contract compilation failures**

```bash
# Clean Foundry cache
cd contracts && forge clean && forge build
```

4. **Deprecated dependency warnings**

```bash
# Check and update dependencies
pnpm deps:check
pnpm deps:update
```

### Project Reset

```bash
# Complete reset
pnpm clean
pnpm deps:clean
cd contracts && forge clean
cd zkp && make clean
cd apps/backend && make clean
pnpm install
pnpm build
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- [Foundry](https://github.com/foundry-rs/foundry) - Smart contract development toolkit
- [Circom](https://github.com/iden3/circom) - Zero-knowledge circuit compiler
- [IPFS](https://ipfs.io/) - Decentralized storage
- [Vite](https://vitejs.dev/) - Fast build tool
- [Permit2](https://github.com/Uniswap/permit2) - Token approval system
