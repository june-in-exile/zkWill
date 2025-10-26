// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "src/JsonCidVerifier.sol";

/**
 * @title TestHelpers
 * @dev Shared test helper functions for WillFactory tests
 */
abstract contract TestHelpers is Test {
    struct CidUploadProofData {
        uint256[2] pA;
        uint256[2][2] pB;
        uint256[2] pC;
        uint256[310] pubSignals;
    }

    struct WillCreationProofData {
        uint256[2] pA;
        uint256[2][2] pB;
        uint256[2] pC;
        uint256[321] pubSignals;
    }

    /**
     * @dev Reads and parses the encrypted will from file
     * @return willTypedJsonObj The parsed TypedJsonObject containing the encrypted will
     */
    function _getEncryptedWillFromFile() public view returns (JsonCidVerifier.TypedJsonObject memory) {
        string memory encryptedJsonPath = "../apps/backend/will/6_encrypted.example.json";
        string memory encryptedJson = vm.readFile(encryptedJsonPath);

        JsonCidVerifier.TypedJsonObject memory willTypedJsonObj;
        willTypedJsonObj.keys = new string[](5);
        willTypedJsonObj.values = new JsonCidVerifier.JsonValue[](5);

        willTypedJsonObj.keys[0] = "algorithm";
        willTypedJsonObj.keys[1] = "iv";
        willTypedJsonObj.keys[2] = "authTag";
        willTypedJsonObj.keys[3] = "ciphertext";
        willTypedJsonObj.keys[4] = "timestamp";

        string memory algorithm = abi.decode(vm.parseJson(encryptedJson, ".algorithm"), (string));
        uint256[] memory iv = abi.decode(vm.parseJson(encryptedJson, ".iv"), (uint256[]));
        uint256[] memory authTag = abi.decode(vm.parseJson(encryptedJson, ".authTag"), (uint256[]));
        uint256[] memory ciphertext = abi.decode(vm.parseJson(encryptedJson, ".ciphertext"), (uint256[]));
        uint256 timestamp = abi.decode(vm.parseJson(encryptedJson, ".timestamp"), (uint256));

        willTypedJsonObj.values[0] = JsonCidVerifier.JsonValue(algorithm, new uint[](0), JsonCidVerifier.JsonValueType.STRING);
        willTypedJsonObj.values[1] = JsonCidVerifier.JsonValue("", iv, JsonCidVerifier.JsonValueType.NUMBER_ARRAY);
        willTypedJsonObj.values[2] = JsonCidVerifier.JsonValue("", authTag, JsonCidVerifier.JsonValueType.NUMBER_ARRAY);
        willTypedJsonObj.values[3] = JsonCidVerifier.JsonValue("", ciphertext, JsonCidVerifier.JsonValueType.NUMBER_ARRAY);
        willTypedJsonObj.values[4] = JsonCidVerifier.JsonValue(vm.toString(timestamp), new uint[](0), JsonCidVerifier.JsonValueType.NUMBER);

        return willTypedJsonObj;
    }

    /**
     * @dev Reads and parses the CID upload proof from files
     * @return CidUploadProofData struct containing proof and public signals
     */
    function _getCidUploadProofFromFiles() public view returns (CidUploadProofData memory) {
        string memory proofPath = "../zkp/circuits/cidUpload/proofs/proof.example.json";
        string memory publicPath = "../zkp/circuits/cidUpload/proofs/public.example.json";

        string memory proofJson = vm.readFile(proofPath);
        string memory publicJson = vm.readFile(publicPath);

        // Parse proof.json
        uint256[2] memory pA;
        uint256[2][2] memory pB;
        uint256[2] memory pC;

        pA[0] = vm.parseUint(vm.parseJsonString(proofJson, ".pi_a[0]"));
        pA[1] = vm.parseUint(vm.parseJsonString(proofJson, ".pi_a[1]"));

        // @note G2 point (pB) needs to swap the order
        pB[0][0] = vm.parseUint(vm.parseJsonString(proofJson, ".pi_b[0][1]"));
        pB[0][1] = vm.parseUint(vm.parseJsonString(proofJson, ".pi_b[0][0]"));
        pB[1][0] = vm.parseUint(vm.parseJsonString(proofJson, ".pi_b[1][1]"));
        pB[1][1] = vm.parseUint(vm.parseJsonString(proofJson, ".pi_b[1][0]"));

        pC[0] = vm.parseUint(vm.parseJsonString(proofJson, ".pi_c[0]"));
        pC[1] = vm.parseUint(vm.parseJsonString(proofJson, ".pi_c[1]"));

        // Parse public.json
        string[] memory pubStringArray = vm.parseJsonStringArray(publicJson, "$");
        require(pubStringArray.length == 310, "Public signals array must have exactly 310 elements");

        uint256[310] memory pubSignals;
        for (uint256 i = 0; i < 310; i++) {
            pubSignals[i] = vm.parseUint(pubStringArray[i]);
        }

        return CidUploadProofData({ pA: pA, pB: pB, pC: pC, pubSignals: pubSignals });
    }

    /**
     * @dev Reads and parses the will creation proof from files
     * @return WillCreationProofData struct containing proof and public signals
     */
    function _getWillCreationProofFromFiles() public view returns (WillCreationProofData memory) {
        string memory proofPath = "../zkp/circuits/willCreation/proofs/proof.example.json";
        string memory publicPath = "../zkp/circuits/willCreation/proofs/public.example.json";

        string memory proofJson = vm.readFile(proofPath);
        string memory publicJson = vm.readFile(publicPath);

        // Parse proof.json
        uint256[2] memory pA;
        uint256[2][2] memory pB;
        uint256[2] memory pC;

        pA[0] = vm.parseUint(vm.parseJsonString(proofJson, ".pi_a[0]"));
        pA[1] = vm.parseUint(vm.parseJsonString(proofJson, ".pi_a[1]"));

        // @note G2 point (pB) needs to swap the order
        pB[0][0] = vm.parseUint(vm.parseJsonString(proofJson, ".pi_b[0][1]"));
        pB[0][1] = vm.parseUint(vm.parseJsonString(proofJson, ".pi_b[0][0]"));
        pB[1][0] = vm.parseUint(vm.parseJsonString(proofJson, ".pi_b[1][1]"));
        pB[1][1] = vm.parseUint(vm.parseJsonString(proofJson, ".pi_b[1][0]"));

        pC[0] = vm.parseUint(vm.parseJsonString(proofJson, ".pi_c[0]"));
        pC[1] = vm.parseUint(vm.parseJsonString(proofJson, ".pi_c[1]"));

        // Parse public.json
        string[] memory pubStringArray = vm.parseJsonStringArray(publicJson, "$");
        require(pubStringArray.length == 321, "Public signals array must have exactly 321 elements");

        uint256[321] memory pubSignals;
        for (uint256 i = 0; i < 321; i++) {
            pubSignals[i] = vm.parseUint(pubStringArray[i]);
        }

        return WillCreationProofData({ pA: pA, pB: pB, pC: pC, pubSignals: pubSignals });
    }
}
