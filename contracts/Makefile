ENV_FILE := ../.env
include $(ENV_FILE)
export

.PHONY: split-multiplier2Verifier split-cidUploadVerifier split-willCreationVerifier split-verifiers \
		sync-anvil sync-zkp sync clean-address clean-verifiers-and-proofs clean-typechain clean \
		install build test test-fuzz test-integration test-unit deploy \
	 	format typechain fork-clean fork fork-background
	 
MY_PRIVATE_KEY := $(EXECUTOR_PRIVATE_KEY)

ESTATES := "[($(BENEFICIARY0),$(TOKEN0),$(AMOUNT0)),($(BENEFICIARY1),$(TOKEN1),$(AMOUNT1))]"

# Check network
ifeq ($(USE_ANVIL),true)
	RPC_URL := $(ANVIL_RPC_URL)
	CHAIN_ID := $(ANVIL_CHAIN_ID)
else
	RPC_URL := $(ARB_SEPOLIA_RPC_URL)
	CHAIN_ID := $(ARB_SEPOLIA_CHAIN_ID)
endif

# -------------- Split Verifier Commands ----------------

split-multiplier2Verifier:
	@pnpm exec tsx ../shared/utils/file/splitVerifier.ts ./src/Multiplier2Verifier.sol

split-cidUploadVerifier:
	@pnpm exec tsx ../shared/utils/file/splitVerifier.ts ./src/CidUploadVerifier.sol

split-willCreationVerifier:
	@pnpm exec tsx ../shared/utils/file/splitVerifier.ts ./src/WillCreationVerifier.sol

split-verifiers: split-multiplier2Verifier split-cidUploadVerifier split-willCreationVerifier

# ------------- Synchronization Commands ----------------

sync-anvil:
	@pnpm exec tsx ../shared/utils/file/syncAnvil.ts

sync-zkp:
	@pnpm exec tsx ../shared/utils/file/syncZkp.ts
	@$(MAKE) split-verifiers

sync: sync-anvil sync-zkp

# ---------------- Clean Commands -----------------------

clean-address:
	@pnpm exec tsx ../shared/utils/file/resetEnvVariable.ts CID_UPLOAD_VERIFIER WILL_CREATION_VERIFIER JSON_CID_VERIFIER WILL_FACTORY

clean-verifiers-and-proofs:
	@rm -rf src/Multiplier2Verifier
	@rm -rf src/CidUploadVerifier
	@rm -rf src/WillCreationVerifier
# 	@pnpm exec tsx ../shared/utils/file/resetEnvVariable.ts \
		MULTIPLIER2_PA_ARRAY MULTIPLIER2_PB_ARRAY MULTIPLIER2_PC_ARRAY MULTIPLIER2_PUBSIGNALS_ARRAY \
		CID_UPLOAD_PA_ARRAY CID_UPLOAD_PB_ARRAY CID_UPLOAD_PC_ARRAY CID_UPLOAD_PUBSIGNALS_ARRAY \
		WILL_CREATION_PA_ARRAY WILL_CREATION_PB_ARRAY WILL_CREATION_PC_ARRAY WILL_CREATION_PUBSIGNALS_ARRAY

clean-typechain:
	@rm -rf ../shared/types/typechain-types

clean: clean-address clean-verifiers-and-proofs clean-typechain
	@forge clean
	@rm -rf cache broadcast lib

# ---------------- Format Commands -----------------------

format:
	@forge fmt

# ----------------- CICD Commands -----------------------

install:
	@rm -rf lib
	@forge install foundry-rs/forge-std
	@forge install OpenZeppelin/openzeppelin-contracts
	@forge install Uniswap/permit2

build: sync
	@forge build
	@$(MAKE) typechain

typechain: 
	@pnpm exec typechain --target ethers-v6 --out-dir ../shared/types/typechain-types 'out/**/*.sol/*.json'

test-fuzz: sync-zkp
	@pnpm test "test/fuzz/*"

test-integration: sync-zkp
	@pnpm test "test/integration/*"

test-unit: sync-zkp
	@pnpm test "test/unit/*"

test: sync-zkp
	@pnpm test

# --------------- Conditional Deployment ----------------

deploy-multiplier2verifier: sync-anvil
	@source $(ENV_FILE) && \
	if [ "$$USE_ANVIL" = "true" ]; then \
		$(MAKE) deploy-multiplier2verifier-to-forked-arb-sepolia; \
	else \
		$(MAKE) deploy-multiplier2verifier-to-arb-sepolia; \
	fi

deploy-cidUploadVerifier: sync-anvil
	@source $(ENV_FILE) && \
	if [ "$$USE_ANVIL" = "true" ]; then \
		$(MAKE) deploy-cidUploadVerifier-to-forked-arb-sepolia; \
	else \
		$(MAKE) deploy-cidUploadVerifier-to-arb-sepolia; \
	fi

deploy-willCreationVerifier: sync-anvil
	@source $(ENV_FILE) && \
	if [ "$$USE_ANVIL" = "true" ]; then \
		$(MAKE) deploy-willCreationVerifier-to-forked-arb-sepolia; \
	else \
		$(MAKE) deploy-willCreationVerifier-to-arb-sepolia; \
	fi

deploy-jsonCidVerifier: sync-anvil
	@source $(ENV_FILE) && \
	if [ "$$USE_ANVIL" = "true" ]; then \
		$(MAKE) deploy-jsonCidVerifier-to-forked-arb-sepolia; \
	else \
		$(MAKE) deploy-jsonCidVerifier-to-arb-sepolia; \
	fi

deploy-willFactory: sync-anvil
	@source $(ENV_FILE) && \
	if [ "$$USE_ANVIL" = "true" ]; then \
		$(MAKE) deploy-willFactory-to-forked-arb-sepolia; \
	else \
		$(MAKE) deploy-willFactory-to-arb-sepolia; \
	fi

deploy: sync-anvil
	@source $(ENV_FILE) && \
	if [ "$$USE_ANVIL" = "true" ]; then \
		$(MAKE) deploy-to-forked-arb-sepolia; \
	else \
		$(MAKE) deploy-to-arb-sepolia; \
	fi

# ------------ Scripts for Arbitrun Sepolia -------------

deploy-multiplier2verifier-to-arb-sepolia:
	@forge script \
		--broadcast \
		--verify \
		--rpc-url $(ARB_SEPOLIA_RPC_URL) \
		--etherscan-api-key $(ARBSCAN_API_KEY) \
		--private-key $(MY_PRIVATE_KEY) \
		script/Multiplier2Verifier.s.sol:Multiplier2VerifierScript
	@pnpm exec tsx ../shared/utils/file/syncAddress.ts MULTIPLIER2_VERIFIER Multiplier2Verifier $(CHAIN_ID)

deploy-cidUploadVerifier-to-arb-sepolia:
	@forge script \
		--broadcast \
		--verify \
		--rpc-url $(ARB_SEPOLIA_RPC_URL) \
		--etherscan-api-key $(ARBSCAN_API_KEY) \
		--private-key $(MY_PRIVATE_KEY) \
		script/CidUploadVerifier.s.sol:CidUploadVerifierScript
	@pnpm exec tsx ../shared/utils/file/syncAddress.ts CID_UPLOAD_VERIFIER CidUploadVerifier $(CHAIN_ID)

deploy-willCreationVerifier-to-arb-sepolia:
	@forge script \
		--broadcast \
		--verify \
		--rpc-url $(ARB_SEPOLIA_RPC_URL) \
		--etherscan-api-key $(ARBSCAN_API_KEY) \
		--private-key $(MY_PRIVATE_KEY) \
		script/WillCreationVerifier.s.sol:WillCreationVerifierScript
	@pnpm exec tsx ../shared/utils/file/syncAddress.ts WILL_CREATION_VERIFIER WillCreationVerifier $(CHAIN_ID)

deploy-jsonCidVerifier-to-arb-sepolia:
	@forge script \
		--broadcast \
		--verify \
		--rpc-url $(ARB_SEPOLIA_RPC_URL) \
		--etherscan-api-key $(ARBSCAN_API_KEY) \
		--private-key $(MY_PRIVATE_KEY) \
		script/JsonCidVerifier.s.sol:JsonCidVerifierScript
	@pnpm exec tsx ../shared/utils/file/syncAddress.ts JSON_CID_VERIFIER JsonCidVerifier $(CHAIN_ID)

deploy-willFactory-to-arb-sepolia:
	@forge script \
		--broadcast \
		--verify \
		--rpc-url $(ARB_SEPOLIA_RPC_URL) \
		--etherscan-api-key $(ARBSCAN_API_KEY) \
		--private-key $(MY_PRIVATE_KEY) \
		script/WillFactory.s.sol:WillFactoryScript
	@pnpm exec tsx ../shared/utils/file/syncAddress.ts WILL_FACTORY WillFactory $(CHAIN_ID)

deploy-to-arb-sepolia: deploy-cidUploadVerifier-to-arb-sepolia deploy-willCreationVerifier-to-arb-sepolia deploy-jsonCidVerifier-to-arb-sepolia
	@$(MAKE) deploy-willFactory-to-arb-sepolia

# --------- Scripts for forked Arbitrun Sepolia ---------

fork-clean:
	@pkill anvil 2>/dev/null || true
	@sleep 1
	
fork: fork-clean
	@anvil --fork-url $(ARB_SEPOLIA_RPC_URL) --chain-id $(ANVIL_CHAIN_ID)

fork-background: fork-clean
	@anvil --fork-url $(ARB_SEPOLIA_RPC_URL) --chain-id $(ANVIL_CHAIN_ID) &

deploy-multiplier2verifier-to-forked-arb-sepolia:
	@forge script \
		--broadcast \
		--fork-url $(ANVIL_RPC_URL) \
		--private-key $(MY_PRIVATE_KEY) \
		script/Multiplier2Verifier.s.sol:Multiplier2VerifierScript
	@pnpm exec tsx ../shared/utils/file/syncAddress.ts MULTIPLIER2_VERIFIER Multiplier2Verifier $(CHAIN_ID)

deploy-cidUploadVerifier-to-forked-arb-sepolia:
	@forge script \
		--broadcast \
		--fork-url $(ANVIL_RPC_URL) \
		--private-key $(MY_PRIVATE_KEY) \
		script/CidUploadVerifier.s.sol:CidUploadVerifierScript
	@pnpm exec tsx ../shared/utils/file/syncAddress.ts CID_UPLOAD_VERIFIER CidUploadVerifier $(CHAIN_ID)

deploy-willCreationVerifier-to-forked-arb-sepolia:
	forge script \
		--broadcast \
		--fork-url $(ANVIL_RPC_URL) \
		--private-key $(MY_PRIVATE_KEY) \
		script/WillCreationVerifier.s.sol:WillCreationVerifierScript
	pnpm exec tsx ../shared/utils/file/syncAddress.ts WILL_CREATION_VERIFIER WillCreationVerifier $(CHAIN_ID)

deploy-jsonCidVerifier-to-forked-arb-sepolia:
	@forge script \
	 	--broadcast \
		--fork-url $(ANVIL_RPC_URL) \
		--private-key $(MY_PRIVATE_KEY) \
		script/JsonCidVerifier.s.sol:JsonCidVerifierScript
	@pnpm exec tsx ../shared/utils/file/syncAddress.ts JSON_CID_VERIFIER JsonCidVerifier $(CHAIN_ID)

deploy-willFactory-to-forked-arb-sepolia:
	@forge script \
		--broadcast \
		--fork-url $(ANVIL_RPC_URL) \
		--private-key $(MY_PRIVATE_KEY) \
		script/WillFactory.s.sol:WillFactoryScript
	@pnpm exec tsx ../shared/utils/file/syncAddress.ts WILL_FACTORY WillFactory $(CHAIN_ID)

deploy-to-forked-arb-sepolia: deploy-cidUploadVerifier-to-forked-arb-sepolia deploy-willCreationVerifier-to-forked-arb-sepolia deploy-jsonCidVerifier-to-forked-arb-sepolia
	@$(MAKE) deploy-willFactory-to-forked-arb-sepolia

# ------------------ Call CID Verifier ------------------

EXAMPLE_JSON_OBJ := '(["algorithm","iv","authTag","ciphertext","timestamp"],["aes-256-gcm","SXwGj4zpnPz6fJvo","tp0VPERBYMhUac8HyQwfFA==","47ljOJWRts3C03tiY0OWLqCfioKKp9p9RFWPB2j/qJ3P2ZLVKMDVdbTa/DJcf7mqnFhJkBToyiA51e4GfNK4SOjshBi4XdT/bB2JMrb5KJKMbCQ+yWsCpr8Ujx9WyyRYV1CtY4LL3ob0Wm6kCygABaoxFX/6dgUbRmLSrUjK0Xf3lj+jP5Oidx/dDlu308E5VqHDSGj0xAvieJjEbdSEwanoCzSALzBI/wN9JhPar/YU8IWdDs6BMKN98ops4olWiGLZl2MmWI/GqzREyg7bqiLQic3ui2dwI9FrNvMB42NKk+qwJQt8jvlrXpaVRij4KpTUtCJVdRK0v91XdC3sjHRxP1mNzfVz1vjrHauh2m14G9CBZDQEm0qoUwjkiO8zoaGpbhLtX1kYKASe0V1v0amN2FXHKqHAXHGo7VVNFaFH8hHlLD0VXroacsSnMzA5dQQJ6Q5m71Kh6TyuRqmGqmPLg5umt+eqkcYiFkAh2qnCY9tWMReYkwZOIFwv8gjd7waERHtm+HZ0M+u+IFw2lA8qyLC4WjOKzu4qVR7BeScjsj3WOvPaPcURefmkZQuQBluBGd3iqwjX89ovfNSmLjbkQ4eGijif3u9O2pIwY9+FrQWYx+ZMv9eIweIRJIWFq8RzleXKx6CNlbRkYfLXs51FTHCdzuH/gbc8jj7orlB4LgZG5d04Z89Zfmnfzfh4raycABY+RR6nDc6bXz8mpbEhfN9GHmxsXDYEkWdyvXjqicNwXwgMzUQBqlLiJyw6PrzGX2f2ZjZ/cQ7uA0NYc47kz0NyJTP/rYTZYrNJgKS0WvCJH2laiSnoNqdEf7RTX5Yffk+ksUwpitq724y5BtNuLP5V3RAevH+/hFCJSTzEoiUbsT1i3YlcyxVP5zfDdTY8PIHAKlTCAoRk7giImm8VAZ9Wf1YUaKsCgXz12kIEZTHso+a7eFl9lUbrniPLdRaXdGp7Cns6t9RhU3YLdBoF3R7XLkOd3Mh9mlXXVraXILHKPaKgVHDUgoBuCvz7nMR44abD2Cd/3+Yot2lu1Ac4V1tKxarRuWzmSooxfpEQ0esgVQFWVtMtDQ+sau2+MmyXGR4th96McXxeMu2u6pbjbhVewdrO6aaOiGFzoXSMfHrHEegvay1YOavYR0Ducd87BaYRIHhvP4cDyi0baJAFiPBLlzLBswjTLK/EqXV2t5wrpnT4OLcvWWd+cTK/w2m09ZD1IhsUje4UUeVQqmQ+JRmOrsu1jhTcCA==","2025-06-17T18:34:55.262Z"])'
EXAMPLE_CID := 'bagaaieraxixnqlxvscc7b4v6d5gpl3wwig6okfftz62xtle32tdzlewerepa'

jsoncidverify-on-chain:
	@cast call $(JSON_CID_VERIFIER) --rpc-url $(RPC_URL) \
		"verifyCID((string[],string[]),string)(bool)" \
		$(EXAMPLE_JSON_OBJ) $(EXAMPLE_CID)
	@echo "$(YELLOW)Expect: true$(RESET)"

generateCIDString:
	@cast call $(JSON_CID_VERIFIER) --rpc-url $(RPC_URL) \
		"generateCIDString((string[],string[]))(string)" \
		$(EXAMPLE_JSON_OBJ)
	@echo "$(YELLOW)Expect: $(EXAMPLE_CID)$(RESET)"

# -------------------- Call Factory ---------------------

# ----------------------- Read --------------------------

cidUploadVerifier:
	@cast call $(WILL_FACTORY) --rpc-url $(RPC_URL) \
		"cidUploadVerifier()(address)"
	@echo "$(YELLOW)Expect: $(CID_UPLOAD_VERIFIER)$(RESET)"

willCreationVerifier:
	@cast call $(WILL_FACTORY) --rpc-url $(RPC_URL) \
		"willCreationVerifier()(address)"
	@echo "$(YELLOW)Expect: $(WILL_CREATION_VERIFIER)$(RESET)"

executor:
	@cast call $(WILL_FACTORY) --rpc-url $(RPC_URL) \
		"executor()(address)"
	@echo "$(YELLOW)Expect: $(EXECUTOR)$(RESET)"

cidUploadedTime:
	@cast call --from $(EXECUTOR) $(WILL_FACTORY) --rpc-url $(RPC_URL) \
		"cidUploadedTimes(string)(uint256)" \
		$(CID) | \
		sed 's/.*\([0-9]\{10\}\).*/\1/' | \
		xargs -I {} gdate -d "@{}" "+%Y-%m-%d %H:%M:%S"
	@echo "$(YELLOW)Expect: UTC+8 time of calling uploadCid$(RESET)"

cidNotarizedTimes:
	@cast call --from $(EXECUTOR)  $(WILL_FACTORY) --rpc-url $(RPC_URL) \
		"cidNotarizedTimes(string)(uint256)" \
		$(CID) | \
		sed 's/.*\([0-9]\{10\}\).*/\1/' | \
		xargs -I {} gdate -d "@{}" "+%Y-%m-%d %H:%M:%S"
	@echo "$(YELLOW)Expect: UTC+8 time of calling notarizeCid$(RESET)"

will:
	@cast call --from $(EXECUTOR) $(WILL_FACTORY) --rpc-url $(RPC_URL) \
		"wills(string)(address)" \
		$(CID)
	@echo "$(YELLOW)Expect: $(WILL)$(RESET)"

predictWill:
	@cast call --from $(EXECUTOR) $(WILL_FACTORY) --rpc-url $(RPC_URL) \
		"predictWill(address,(address,address,uint256)[],uint256)(address)" \
		$(TESTATOR) $(ESTATES) $(SALT)
	@echo "$(YELLOW)Expect: $(WILL)$(RESET)"
	
# ------------------- Verify Contract -------------------

verify-will:
	forge verify-contract \
		--chain-id $(ARB_SEPOLIA_CHAIN_ID) \
		--constructor-args $$(cast abi-encode "constructor(address,address,address,(address,address,uint256)[])" \
			"$(PERMIT2)" \
			"$(TESTATOR)" \
			"$(EXECUTOR)" \
			$(ESTATES)) \
		--verifier etherscan \
		--etherscan-api-key ${ARBSCAN_API_KEY} \
		--watch \
		$(WILL) \
		src/Will.sol:Will

# --------------------- Will -----------------------
# ----------------------- Read --------------------------

permit2:
	@cast call $(WILL) --rpc-url $(RPC_URL) \
		"permit2()(address)"
	@echo "$(YELLOW)Expect: 0x000000000022D473030F116dDEE9F6B43aC78BA3$(RESET)"

testator:
	@cast call $(WILL) --rpc-url $(RPC_URL) \
		"testator()(address)"
	@echo "$(YELLOW)Expect: $(TESTATOR)$(RESET)"

estates:
	@cast call $(WILL) --rpc-url $(RPC_URL) \
		"estates(uint256)(address,address,uint256)" \
		$(ESTATE_INDEX)

estate0:
	@ESTATE_INDEX=1 $(MAKE) estates
	@echo "$(YELLOW)Expect:\n$(BENEFICIARY0)\n$(TOKEN0)\n$(AMOUNT0)$(RESET)"

estate1:
	@ESTATE_INDEX=1 $(MAKE) estates
	@echo "$(YELLOW)Expect:\n$(BENEFICIARY1)\n$(TOKEN1)\n$(AMOUNT1)$(RESET)"

executed:
	@cast call $(WILL) --rpc-url $(RPC_URL) \
		"executed()(bool)"

executed-before:
	@$(MAKE) executed
	@echo "$(YELLOW)Expect: false$(RESET)"

executed-after:
	@$(MAKE) executed
	@echo "$(YELLOW)Expect: true$(RESET)"

# ----------------------- Write -------------------------
		
signatureTransferToBeneficiaries:
	@cast send --from $(EXECUTOR) --private-key $(EXECUTOR_PRIVATE_KEY) $(WILL) --rpc-url $(RPC_URL) \
		"signatureTransferToBeneficiaries(uint256,uint256,bytes)()" \
		$(NONCE) $(DEADLINE) $(PERMIT2_SIGNATURE)

# ------------------- Check Balance ----------------------

check-testator-usdc-balance:
	@cast balance --erc20 $(ARB_SEPOLIA_USDC) $(TESTATOR) --rpc-url $(RPC_URL)

check-beneficiary-usdc-balance:
	@cast balance --erc20 $(ARB_SEPOLIA_USDC) $(BENEFICIARY0) --rpc-url $(RPC_URL)

check-executor-usdc-balance:
	@cast balance --erc20 $(ARB_SEPOLIA_USDC) $(EXECUTOR) --rpc-url $(RPC_URL)

check-testator-link-balance:
	@cast balance --erc20 $(ARB_SEPOLIA_LINK) $(TESTATOR) --rpc-url $(RPC_URL)

check-beneficiary-link-balance:
	@cast balance --erc20 $(ARB_SEPOLIA_LINK) $(BENEFICIARY1) --rpc-url $(RPC_URL)

check-executor-link-balance:
	@cast balance --erc20 $(ARB_SEPOLIA_LINK) $(EXECUTOR) --rpc-url $(RPC_URL)

check-balance-before:
	@echo "Testator's USDC:"
	@$(MAKE) check-testator-usdc-balance

	@echo "\nBeneficiary's USDC:"
	@$(MAKE) check-beneficiary-usdc-balance

	@echo "\nExecutor's USDC:"
	@$(MAKE) check-executor-usdc-balance

	@echo "\nTestator's LINK:"
	@$(MAKE) check-testator-link-balance

	@echo "\nBeneficiary's LINK:"
	@$(MAKE) check-beneficiary-link-balance

	@echo "\nExecutor's LINK:"
	@$(MAKE) check-executor-link-balance

check-balance-after:
	@echo "Testator's USDC:"
	@$(MAKE) check-testator-usdc-balance
	@echo "$(YELLOW)Expect: 1000 less$(RESET)"

	@echo "\nBeneficiary's USDC:"
	@$(MAKE) check-beneficiary-usdc-balance
	@echo "$(YELLOW)Expect: 1000 more$(RESET)"

	@echo "\nExecutor's USDC:"
	@$(MAKE) check-executor-usdc-balance
	@echo "$(YELLOW)Expect: unchanged$(RESET)"

	@echo "\nTestator's LINK:"
	@$(MAKE) check-testator-link-balance
	@echo "$(YELLOW)Expect: 5000000 less$(RESET)"

	@echo "\nBeneficiary's LINK:"
	@$(MAKE) check-beneficiary-link-balance
	@echo "$(YELLOW)Expect: 5000000 more$(RESET)"
	
	@echo "\nExecutor's LINK:"
	@$(MAKE) check-executor-link-balance
	@echo "$(YELLOW)Expect: unchanged$(RESET)"


# ------------------- Debugging -------------------

PERMIT := "([($(TOKEN0),$(AMOUNT0)),($(TOKEN1),$(AMOUNT1))],$(NONCE),$(DEADLINE))"

deploy-debugger-to-forked-arb-sepolia:
	forge script \
		--broadcast \
		--fork-url $(ANVIL_RPC_URL) \
		--private-key $(MY_PRIVATE_KEY) \
		script/PermitVerifier.s.sol:PermitVerifierScript

TOKEN_PERMISSIONS_TYPEHASH:
	@cast call $(PERMIT_VERIFIER) --rpc-url $(RPC_URL) \
		"_TOKEN_PERMISSIONS_TYPEHASH()(bytes32)"
# 0x618358ac3db8dc274f0cd8829da7e234bd48cd73c4a740aede1adec9846d06a1

PERMIT_BATCH_TRANSFER_FROM_TYPEHASH:
	@cast call $(PERMIT_VERIFIER) --rpc-url $(RPC_URL) \
		"_PERMIT_BATCH_TRANSFER_FROM_TYPEHASH()(bytes32)"
# 0xfcf35f5ac6a2c28868dc44c302166470266239195f02b0ee408334829333b766

HASHED_NAME:
	@cast call $(PERMIT_VERIFIER) --rpc-url $(RPC_URL) \
		"_HASHED_NAME()(bytes32)"
# 0x9ac997416e8ff9d2ff6bebeb7149f65cdae5e32e2b90440b566bb3044041d36a

TYPE_HASH:
	@cast call $(PERMIT_VERIFIER) --rpc-url $(RPC_URL) \
		"_TYPE_HASH()(bytes32)"
# 0x8cad95687ba82c2ce50e74f7b754645e5117c3a5bec8151c0726d5857980a866

# With Anvil, the block.chainid used in DOMAIN_SEPARATOR() is always 31337 no matter forking which chain
getChainId:
	@cast call $(PERMIT_VERIFIER) --rpc-url $(RPC_URL) \
		"getChainId()(uint256)"

DOMAIN_SEPARATOR:
	@cast call $(PERMIT_VERIFIER) --rpc-url $(RPC_URL) \
		"DOMAIN_SEPARATOR()(bytes32)"
# 0x4d553c58ae79a6c4ba64f0e690a5d1cd2deff8c6b91cf38300e0f2b76f9ee346

hashPermit:
	@cast call $(PERMIT_VERIFIER) --rpc-url $(RPC_URL) \
		"hashPermit(((address,uint256)[],uint256,uint256),address)(bytes32)" \
		$(PERMIT) $(WILL)
# PERMIT_DIGEST := 0x4eadcedffba99db39567da6212ac1ad9eb429fe5e6ce10d866140a6934aa84e1

hashTypedData:
	@cast call $(PERMIT_VERIFIER) --rpc-url $(RPC_URL) \
		"hashTypedData(bytes32)(bytes32)" \
		$(PERMIT_DIGEST)
# TYPED_PERMIT_DIGEST := 0x3bbbc719c9f5bb11b342bbe24efe817e51f8be9ff221c9c39db36a021b25698d

recoverSigner:
	@cast call $(PERMIT_VERIFIER) --rpc-url $(RPC_URL) \
		"recoverSigner(bytes,bytes32)(address)" \
		$(PERMIT2_SIGNATURE) $(TYPED_PERMIT_DIGEST)
# SIGNER := 0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc

verifyPermit:
	@cast send --from $(EXECUTOR) --private-key $(EXECUTOR_PRIVATE_KEY) $(PERMIT_VERIFIER) --rpc-url $(RPC_URL) \
		"verifyPermit(address,((address,uint256)[],uint256,uint256),address,bytes)()" \
		$(TESTATOR) $(PERMIT) $(WILL) $(PERMIT2_SIGNATURE)