# Default circuit for circuit-specific operations
# CIRCUIT = willCreation
# CIRCUIT = cidUpload
CIRCUIT ?= multiplier2

# TEMPLATE = CreateWill
# TEMPLATE = UploadCid
TEMPLATE ?= Multiplier2

# Directory structure
SHARED_KEYS := ./circuits/shared/keys
PTAU_PATH := $(SHARED_KEYS)/downloaded/ppot_0080_final_23.ptau

DIR := ./circuits/$(CIRCUIT)
INPUTS := $(DIR)/inputs
BUILD := $(DIR)/build
KEYS := $(DIR)/keys
PROOFS := $(DIR)/proofs
CONTRACTS := $(DIR)/contracts
VERIFIER := $(CONTRACTS)/verifier.sol

DOWNLOAD_CMD = $(shell which wget > /dev/null 2>&1 && echo "wget -O" || echo "curl -o")

# Default target
help:
	@echo "Available commands:"
	@echo ""
	@echo "⚗️  Circuit Operations (current: $(CIRCUIT)):"
	@echo "  make circuit             - Complete circuit setup (compile + keys + verifier)"
	@echo "  make circuit-no-proof    - Circuit setup without proof (compile + verifier)"
	@echo "  make untag               - Untag template for current circuit"
	@echo "  make compile             - Compile current circuit"
	@echo "  make witness             - Generate witness for current circuit"
	@echo "  make prove               - Generate proof for current circuit"
	@echo "  make verify              - Verify proof for current circuit"
	@echo "  make verifier            - Generate Solidity verifier"
	@echo "  make generate-call       - Generate Solidity call data"
	@echo ""
	@echo "🔑 Key Management:"
	@echo "  make trusted-setup-phase1            - Setup Powers of Tau (shared)"
	@echo "  make trusted-setup-phase1-download   - Download Powers of Tau (shared)"
	@echo "  make trusted-setup-phase2            - Setup circuit-specific keys"
	@echo ""
	@echo "🧹 Test:"
	@echo "  make test                - Test current circuit"
	@echo "  make test-circuits       - Test all circuits"
	@echo "  make test-all            - Test AES-256-GCM helper and all circuits"
	@echo ""
	@echo "🧹 Cleanup:"
	@echo "  make clean               - Clean current circuit ($(CIRCUIT))"
	@echo "  make clean-test          - Clean all test circuits"
	@echo "  make clean-all           - Clean all circuits"
	@echo ""
	@echo "🎯 Circuit-specific operations:"
	@echo "  make CIRCUIT=<name> <command>  - Run command for specific circuit"

define set_ptau_vars
	$(eval SOURCE = $(1)) # <downloaded|generated>
	$(eval PTAU_SIZE = $(2)) # 00, 01, 02, ..., 26, 27, final
	$(eval FINAL_PTAU_PATH = $(SHARED_KEYS)/$(SOURCE)/pot$(PTAU_SIZE).ptau)
	$(eval PTAU_URL = https://pse-trusted-setup-ppot.s3.eu-central-1.amazonaws.com/pot28_0080/ppot_0080_$(PTAU_SIZE).ptau)
endef

trusted-setup-phase1-download:
	$(call set_ptau_vars,downloaded,20)
	@echo "⚡ Downloading powers of tau..."
	mkdir -p $(SHARED_KEYS)/downloaded
	@if [ ! -f $(FINAL_PTAU_PATH) ]; then \
		$(DOWNLOAD_CMD) $(FINAL_PTAU_PATH) $(PTAU_URL); \
		snarkjs powersoftau truncate $(FINAL_PTAU_PATH); \
		echo "✅ Powers of Tau downloaded and truncated!"; \
	else \
		echo "✅ Powers of Tau already exists!"; \
	fi

trusted-setup-phase1:
	$(call set_ptau_vars,generated,06)
	@echo "🔐 Setting up trusted ceremony..."
	mkdir -p $(SHARED_KEYS)/generated
	@if [ ! -f $(FINAL_PTAU_PATH) ]; then \
		snarkjs powersoftau new bn128 $(PTAU_SIZE) $(SHARED_KEYS)/pot$(PTAU_SIZE)_0000.ptau -v; \
		snarkjs powersoftau contribute $(SHARED_KEYS)/pot$(PTAU_SIZE)_0000.ptau $(SHARED_KEYS)/pot$(PTAU_SIZE)_0001.ptau --name="First contribution" -v -e="some random text"; \
		snarkjs powersoftau prepare phase2 $(SHARED_KEYS)/pot$(PTAU_SIZE)_0001.ptau $(FINAL_PTAU_PATH) -v; \
		snarkjs powersoftau truncate $(FINAL_PTAU_PATH); \
		rm -rf $(SHARED_KEYS)/pot*.ptau; \
		echo "✅ Powers of Tau set and truncated!"; \
	else \
		echo "✅ Powers of Tau already exists!"; \
	fi

# Circuit operations
circuit: compile witness trusted-setup-phase2 prove verify verifier generate-call
	@echo "✅ Circuit $(TEMPLATE) setup completed!"

circuit-no-proof: compile trusted-setup-phase2 verifier
	@echo "✅ Circuit $(TEMPLATE) setup without proof completed!"

untag:
	@pnpm exec tsx ./tests/util/untagTemplate.ts "$(DIR)/$(CIRCUIT).circom" "$(TEMPLATE)" "true"
	
compile:
	@echo "🔨 Compiling circuit: $(TEMPLATE)..."
	mkdir -p $(BUILD)
	circom $(DIR)/$(CIRCUIT).circom --r1cs --sym --wasm -l node_modules --O2 --output $(BUILD)
	@echo "✅ Circuit $(TEMPLATE) compiled successfully!"

witness:
	@echo "🧮 Generating witness for $(TEMPLATE)..."
	@if [ ! -f $(INPUTS)/input.json ]; then \
		echo "❌ Input file not found."; \
		exit 1; \
	fi
	snarkjs wtns calculate $(BUILD)/$(CIRCUIT)_js/$(CIRCUIT).wasm $(INPUTS)/input.json $(BUILD)/witness.wtns
	snarkjs wtns export json $(BUILD)/witness.wtns $(BUILD)/witness.json
	@echo "✅ Witness generated successfully!"

trusted-setup-phase2:
	@echo "🔑 Generating keys for $(TEMPLATE)..."
	mkdir -p $(KEYS)
	@if [ ! -f $(PTAU_PATH) ]; then \
		echo "❌ Powers of Tau not found."; \
		exit 1; \
	fi
	NODE_OPTIONS=--max-old-space-size=16384 snarkjs groth16 setup $(BUILD)/$(CIRCUIT).r1cs $(PTAU_PATH) $(KEYS)/$(CIRCUIT)_0000.zkey
	snarkjs zkey contribute $(KEYS)/$(CIRCUIT)_0000.zkey $(KEYS)/$(CIRCUIT)_0001.zkey --name="1st Contributor Name" -v -e="another random entropy"
	snarkjs zkey export verificationkey $(KEYS)/$(CIRCUIT)_0001.zkey $(KEYS)/verification_key.json
	@echo "✅ Keys generated successfully!"

prove:
	@echo "🔐 Generating proof for $(TEMPLATE)..."
	mkdir -p $(PROOFS)
	@if [ ! -f $(BUILD)/witness.wtns ]; then \
		echo "❌ Witness not found. Run 'make witness' first."; \
		exit 1; \
	fi
	snarkjs groth16 prove $(KEYS)/$(CIRCUIT)_0001.zkey $(BUILD)/witness.wtns $(PROOFS)/proof.json $(PROOFS)/public.json
	@echo "✅ Proof generated successfully!"

verify:
	@echo "✅ Verifying proof for $(TEMPLATE)..."
	@if [ ! -f $(PROOFS)/proof.json ]; then \
		echo "❌ Proof not found. Run 'make prove' first."; \
		exit 1; \
	fi
	snarkjs groth16 verify $(KEYS)/verification_key.json $(PROOFS)/public.json $(PROOFS)/proof.json
	@echo "✅ Proof verification completed!"
	
verifier:
	@echo "📝 Generating Solidity verifier for $(TEMPLATE)..."
	mkdir -p $(CONTRACTS)
	snarkjs zkey export solidityverifier $(KEYS)/$(CIRCUIT)_0001.zkey $(VERIFIER)
	@echo "✅ Solidity verifier generated: $(VERIFIER)"

generate-call:
	@echo "📞 Generating Solidity call data for $(TEMPLATE)..."
	@if [ ! -f $(PROOFS)/proof.json ]; then \
		echo "❌ Proof not found. Run 'make prove' first."; \
		exit 1; \
	fi
	snarkjs generatecall $(PROOFS)/public.json $(PROOFS)/proof.json

# Cleanup operations
define clean_dir
	{ \
		find $(1) -maxdepth 1 -type f ! -name "*.circom" -delete 2>/dev/null || true; \
		find $(1) -maxdepth 1 -type d ! -name "$$(basename $(1))" ! -name "components" ! -name "inputs" -exec rm -rf {} + 2>/dev/null || true; \
	}
endef

clean:
	@echo "🧹 Cleaning $(CIRCUIT)..."
	@$(call clean_dir,$(DIR))
	@echo "✅ $(CIRCUIT) cleaned!"

clean-all:
	@echo "🧹 Cleaning all circuits..."
	@for circuit_dir in circuits/*/; do \
		[ -d "$$circuit_dir" ] && [ "$$(basename "$$circuit_dir")" != "shared" ] || continue; \
		echo "  Cleaning $$(basename "$$circuit_dir")..."; \
		$(call clean_dir,$$circuit_dir); \
	done
	@echo "✅ All circuits cleaned!"

clean-test:
	@echo "🧹 Cleaning test circuits..."
	rm -rf ./circuits/test
	@echo "✅ Test circuit cleanup completed!"


# Test
test:
	@npm run test ./tests/$(CIRCUIT).test.ts

test-circuits:
	@npm run test

test-all:
	@npm run test:all


# Project status
status:
	@echo "📊 Project Status:"
	@echo "=================="
	@if [ -d "circuits" ]; then \
		echo "📁 Circuits found: $$(find circuits -maxdepth 1 -type d ! -name circuits ! -name shared ! -name test | wc -l)"; \
		for circuit in circuits/*/; do \
			if [ -d "$$circuit" ] && [ "$$(basename $$circuit)" != "shared" ] && [ "$$(basename $$circuit)" != "test" ]; then \
				circuit_name=$$(basename $$circuit); \
				echo "  🔧 $$circuit_name:"; \
				if [ -f "$$circuit/build/$$circuit_name.r1cs" ]; then echo "    ✅ Compiled"; else echo "    ❌ Not compiled"; fi; \
				if [ -f "$$circuit/keys/verification_key.json" ]; then echo "    ✅ Keys generated"; else echo "    ❌ Keys missing"; fi; \
				if [ -f "$$circuit/contracts/verifier.sol" ]; then echo "    ✅ Verifier generated"; else echo "    ❌ Verifier missing"; fi; \
			fi; \
		done; \
	else \
		echo "❌ No circuits directory found"; \
	fi
	@if [ -f "package.json" ]; then echo "📦 TypeScript project: ✅"; else echo "📦 TypeScript project: ❌"; fi
	@if [ -d "node_modules" ]; then echo "📚 Dependencies: ✅"; else echo "📚 Dependencies: ❌"; fi
	@if [ -f $(PTAU_PATH) ]; then echo "⚡ Powers of Tau: ✅"; else echo "⚡ Powers of Tau: ❌"; fi