.PHONY: all

all: clean testatorUploadsEncryptedWill witnessesSignCid notarySignsCid oracleProbateCid executorTransfersEstates

clean:
	@echo "Resetting environment variables..."
	@pnpm exec tsx ../../shared/utils/file/resetEnvVariable.ts SALT WILL \
        BENEFICIARY0 TOKEN0 AMOUNT0 \
        BENEFICIARY1 TOKEN1 AMOUNT1 \
        NONCE DEADLINE PERMIT2_SIGNATURE CID \
		UPLOAD_TX_HASH UPLOAD_TIMESTAMP \
		NOTARIZE_TX_HASH NOTARIZE_TIMESTAMP \
		CREATE_WILL_TX_HASH CREATE_WILL_TIMESTAMP \
		PROBATE_WILL_TX_HASH PROBATE_WILL_TIMESTAMP \
		EXECUTE_WILL_TX_HASH EXECUTE_WILL_TIMESTAMP \
		|| echo "Warning: Failed to reset env variables"
	@echo "Removing generated files..."
	@-rm -f will/3_addressed.json
	@-rm -f will/4_signed.json
	@-rm -f will/5_serialized.json
	@-rm -f will/6_encrypted.json
	@-rm -f will/7_downloaded.json
	@-rm -f will/8_decrypted*.json
	@-rm -f will/9_deserialized.json
	@echo "Removing secret key..."
	@-rm -f ../../shared/utils/cryptography/key.txt

	@@echo "Initialization completed"


testatorUploadsEncryptedWill: approve-permit2 predict-address sign-permit2 verify-permit2 serialize-will encrypt-will prove-for-cid-upload upload-will upload-cid

approve-permit2:
	@pnpm exec tsx src/onchain/permit2/approveTokenPermit2.ts

predict-address:
	@pnpm exec tsx src/onchain/willFactory/predictWill.ts

sign-permit2:
	@pnpm exec tsx src/offchain/signature/permit2.ts

verify-permit2:
	@pnpm exec tsx src/offchain/signature/verifyPermit2.ts

serialize-will:
	@pnpm exec tsx src/offchain/serialization/serialize.ts

encrypt-will:
	@pnpm exec tsx src/offchain/cryptography/encryptWill.ts

prove-for-cid-upload:
	@pnpm exec tsx src/offchain/zkp/cidUpload.ts

upload-will:
	@pnpm exec tsx src/offchain/ipfs/upload.ts

upload-cid:
	@pnpm exec tsx src/onchain/willFactory/uploadCid.ts


notarySignsCid: witnessesSignCid notarize-cid

witnessesSignCid: witness-cid
	@pnpm exec tsx src/offchain/signature/witness.ts

notarize-cid:
	@pnpm exec tsx src/onchain/willFactory/notarizeCid.ts


oracleProbateCid: probate-cid

probate-cid:
	@pnpm exec tsx src/onchain/will/probateCid.ts


executorTransfersEstates: download-will decrypt-will deserialize-will prove-for-will-creation create-will signature-transfer

download-will:
	@pnpm exec tsx src/offchain/ipfs/download.ts

decrypt-will:
	@pnpm exec tsx src/offchain/cryptography/decryptWill.ts

deserialize-will:
	@pnpm exec tsx src/offchain/serialization/deserialize.ts

prove-for-will-creation:
	@pnpm exec tsx src/offchain/zkp/willCreation.ts

create-will:
	@pnpm exec tsx src/onchain/willFactory/createWill.ts

signature-transfer:
	@pnpm exec tsx src/onchain/will/signatureTransfer.ts


utils: keccak256 verify-permit2 encrypt-data decrypt-data decrypt-will-local cid-data cid-path submit-proof

keccak256:
	@pnpm exec tsx ../../shared/utils/cryptography/keccak256.ts \
		--input "TokenPermissions(address token,uint256 amount)"
# 0x618358ac3db8dc274f0cd8829da7e234bd48cd73c4a740aede1adec9846d06a1

encrypt-data:
	@pnpm exec tsx ../../shared/utils/cryptography/encrypt.ts	\
		--algorithm aes-256-gcm \
		--plaintext "Hello, World!"
	@pnpm exec tsx ../../shared/utils/cryptography/encrypt.ts \
		--algorithm chacha20-poly1305 \
		--plaintext "Secret message"
	@pnpm exec tsx ../../shared/utils/cryptography/encrypt.ts \
		--algorithm aes-256-gcm \
		--plaintext "Text" \
		--key "qmpEWRQQ+w1hp6xFYkoXFUHZA8Os71XTWxDZIdNAS7o=" \
		--iv "YjgZJzfIXjAYvwt/"
	@pnpm exec tsx ../../shared/utils/cryptography/encrypt.ts \
		--plaintext "AES-256-CTR algorithm"

decrypt-data:
	@pnpm exec tsx ../../shared/utils/cryptography/decrypt.ts \
		--algorithm aes-256-gcm \
		--ciphertext "Gpom0+vuv9teKLYbPg==" \
		--key "6jGDknBabkzOqplZpenhe9M/4iF2hotChGiVvOERQ7k=" \
		--iv "lV8jzMw8l38VL+kA" \
		--authTag "UKLNsX07gXEth4BE2uFCcw=="
# Hello, World!
	@pnpm exec tsx ../../shared/utils/cryptography/decrypt.ts \
		--algorithm chacha20-poly1305 \
		--ciphertext "GbqjqkNZGT1DIEmfPqI=" \
		--key "i3ysCaBP/LhiFIdN9KAxd5PdIq0ptvJGzwd0FuzJmy4=" \
		--iv "grOq8Gex5t4EIWRI" \
		--authTag "Yu1tQXI0/uqRxDIkSPwzrA=="
# Secret message
	@pnpm exec tsx ../../shared/utils/cryptography/decrypt.ts \
		--algorithm aes-256-gcm \
		--ciphertext "PgG52g==" \
		--key "qmpEWRQQ+w1hp6xFYkoXFUHZA8Os71XTWxDZIdNAS7o=" \
		--iv "YjgZJzfIXjAYvwt/" \
		--authTag "u1NxL5uXKyM/8qbZiBtUvQ=="
# Text
	@pnpm exec tsx ../../shared/utils/cryptography/decrypt.ts \
		--ciphertext "pHd5wodomsWb3bpRbVi6/8gUONBa" \
		--key "NPu551h+p/8ZCJxFOE0ZMHQ9GKgONWTUWfFqbIj6vZ0=" \
		--iv "wqoEnM5H2VDxfIcR7NsdAQ=="
# AES-256-CTR algorithm

decrypt-will-local:
	@pnpm exec tsx src/offchain/cryptography/decryptWill.ts --local

cid-data:
	@pnpm exec tsx src/offchain/ipfs/cid.ts \
		--data '{"algorithm":"aes-256-ctr","iv":[245,188,56,183,175,177,100,223,159,121,83,185,140,246,202,107],"authTag":[],"ciphertext":[55,1,41,141,79,197,144,229,44,22,5,188,114,35,221,211,70,166,14,29,96,21,124,171,167,204,207,102,83,169,146,42,121,105,244,194,137,21,234,153,139,83,41,148,119,127,15,199,246,96,196,109,229,113,134,166,214,115,144,147,30,169,90,3,8,88,53,80,75,121,237,27,115,246,89,60,82,141,140,150,178,244,45,28,180,57,13,159,1,9,18,177,184,100,18,103,124,5,157,213,98,88,253,252,198,234,149,43,161,253,246,101,66,40,20,131,2,235,216,152,112,6,141,72,124,75,57,228,188,29,154,82,29,229,79,192,51,112,37,18,221,244,230,247,179,197,238,26,43,131,183,102,3,212,125,84,255,39,136,146,213,64,128,246,114,219,104,154,12,37,75,66,240,173,225,146,1,68,125,215,145,207,42,40,155,51,80,83,231,42,166,142,3,76,238,177,112,217,173,37,35,251,17,93,179,226,214,108,146,225,103,139,79,62,177,218,90,168,46,197,154,120,227,133,102,238,74,246,38,204,171,84,10,90,124,245,242,77,57,31,31,170,214,187,253,211,83,186,137,239,189,219,237,111,41,236,25,3,247,94,214,111,198,222,5,235,32,119,5],"timestamp":1758811637}'

cid-path:
	@pnpm exec tsx src/offchain/ipfs/cid.ts \
		--path './will/6_encrypted.json'

submit-proof:
	@pnpm exec tsx src/onchain/groth16Verifier/submitProof.ts


# approve-permit2 predict-address sign-permit2 verify-permit2