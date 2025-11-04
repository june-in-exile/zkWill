// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/Vm.sol";
import "src/WillFactory.sol";
import "src/Will.sol";
import "mock/MockContracts.sol";

contract WillFactoryUnitTest is Test {
    WillFactory factory;
    MockCidUploadVerifier mockcidUploadVerifier;
    MockWillCreationVerifier mockWillCreationVerifier;
    MockJsonCidVerifier mockJsonCidVerifier;

    address notary;
    uint256 notaryPrivateKey;
    address oracle;
    uint256 oraclePrivateKey;
    address permit2 = makeAddr("permit2");
    address testator = makeAddr("testator");
    address witness1;
    uint256 witness1PrivateKey;
    address witness2;
    uint256 witness2PrivateKey;
    address executor = makeAddr("executor");
    address random = makeAddr("random");

    uint8 maxEstates = 2;

    address beneficiary0 = makeAddr("beneficiary0");
    address token0 = makeAddr("token0");
    uint256 amount0 = 1000;

    address beneficiary1 = makeAddr("beneficiary1");
    address token1 = makeAddr("token1");
    uint256 amount1 = 2000;

    uint256 salt = 12345;

    JsonCidVerifier.TypedJsonObject willJson;
    string cid = "cid";

    uint256[2] pA = [1, 2];
    uint256[2][2] pB = [[3, 4], [5, 6]];
    uint256[2] pC = [7, 8];
    uint256[310] cidUploadPubSignals;
    uint256[321] willCreationPubSignals;

    Will.Estate[] estates;
    address[2] witnesses;

    function setUp() public {
        notaryPrivateKey = 0x0123456789012345678901234567890123456789012345678901234567890123;
        notary = vm.addr(notaryPrivateKey);

        oraclePrivateKey = 0x1234567890123456789012345678901234567890123456789012345678901234;
        oracle = vm.addr(oraclePrivateKey);

        witness1PrivateKey = 0x2345678901234567890123456789012345678901234567890123456789012345;
        witness1 = vm.addr(witness1PrivateKey);

        witness2PrivateKey = 0x3456789012345678901234567890123456789012345678901234567890123456;
        witness2 = vm.addr(witness2PrivateKey);

        witnesses = [witness1, witness2];

        mockcidUploadVerifier = new MockCidUploadVerifier();
        mockWillCreationVerifier = new MockWillCreationVerifier();
        mockJsonCidVerifier = new MockJsonCidVerifier();

        factory = new WillFactory(
            address(mockcidUploadVerifier),
            address(mockWillCreationVerifier),
            address(mockJsonCidVerifier),
            notary,
            oracle,
            permit2,
            maxEstates
        );

        estates.push(Will.Estate({ beneficiary: beneficiary0, token: token0, amount: amount0 }));

        estates.push(Will.Estate({ beneficiary: beneficiary1, token: token1, amount: amount1 }));

        string[] memory keys = new string[](5);
        keys[0] = "key0";
        keys[1] = "key1";
        keys[2] = "key2";
        keys[3] = "key3";
        keys[4] = "key4";

        JsonCidVerifier.JsonValue[] memory values = new JsonCidVerifier.JsonValue[](5);
        values[0] = JsonCidVerifier.JsonValue("value0", new uint256[](0), JsonCidVerifier.JsonValueType.STRING);
        values[1] = JsonCidVerifier.JsonValue("", new uint256[](16), JsonCidVerifier.JsonValueType.NUMBER_ARRAY);
        values[2] = JsonCidVerifier.JsonValue("", new uint256[](0), JsonCidVerifier.JsonValueType.NUMBER_ARRAY);
        values[3] = JsonCidVerifier.JsonValue("", new uint256[](293), JsonCidVerifier.JsonValueType.NUMBER_ARRAY);
        values[4] = JsonCidVerifier.JsonValue("1234567890", new uint256[](0), JsonCidVerifier.JsonValueType.NUMBER);

        willJson = JsonCidVerifier.TypedJsonObject({ keys: keys, values: values });

        uint256 cidUploadPubSignalIdx = 0;
        cidUploadPubSignals[cidUploadPubSignalIdx++] = uint160(testator);
        for (uint256 i = 0; i < 16; i++) {
            cidUploadPubSignals[cidUploadPubSignalIdx++] = willJson.values[1].numberArray[i];
        }
        for (uint256 i = 0; i < 293; i++) {
            cidUploadPubSignals[cidUploadPubSignalIdx++] = willJson.values[3].numberArray[i];
        }

        uint256 willCreationPubSignalIdx = 0;
        willCreationPubSignals[willCreationPubSignalIdx++] = uint160(testator);
        willCreationPubSignals[willCreationPubSignalIdx++] = uint160(executor);
        for (uint8 i = 0; i < maxEstates; i++) {
            willCreationPubSignals[willCreationPubSignalIdx++] = uint160(estates[i].beneficiary);
            willCreationPubSignals[willCreationPubSignalIdx++] = uint160(estates[i].token);
            willCreationPubSignals[willCreationPubSignalIdx++] = estates[i].amount;
        }
        willCreationPubSignals[willCreationPubSignalIdx++] = uint64(salt);
        willCreationPubSignals[willCreationPubSignalIdx++] = uint64(salt >> 64);
        willCreationPubSignals[willCreationPubSignalIdx++] = uint64(salt >> 128);
        willCreationPubSignals[willCreationPubSignalIdx++] = uint64(salt >> 192);
        for (uint256 i = 0; i < 16; i++) {
            willCreationPubSignals[willCreationPubSignalIdx++] = willJson.values[1].numberArray[i];
        }
        for (uint256 i = 0; i < 293; i++) {
            willCreationPubSignals[willCreationPubSignalIdx++] = willJson.values[3].numberArray[i];
        }
    }

    function _signCidAsWitness(string memory _cid, uint256 privateKey) internal pure returns (bytes memory) {
        bytes32 messageHash = keccak256(abi.encodePacked(_cid));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, ethSignedMessageHash);
        return abi.encodePacked(r, s, v);
    }

    function _getWitnessSignatures(string memory _cid) internal view returns (bytes[2] memory) {
        bytes[2] memory signatures;
        signatures[0] = _signCidAsWitness(_cid, witness1PrivateKey);
        signatures[1] = _signCidAsWitness(_cid, witness2PrivateKey);
        return signatures;
    }

    function test_Constructor() public view {
        assertEq(address(factory.cidUploadVerifier()), address(mockcidUploadVerifier));
        assertEq(address(factory.willCreateVerifier()), address(mockWillCreationVerifier));
        assertEq(address(factory.jsonCidVerifier()), address(mockJsonCidVerifier));
        assertEq(factory.oracle(), oracle);
        assertEq(factory.permit2(), permit2);
    }

    function test_UploadCid_Success() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);

        vm.expectEmit(true, false, false, false);
        emit WillFactory.CidUploaded(cid, block.timestamp);

        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid, witnesses);

        assertEq(factory.cidUploadedTimes(cid), block.timestamp);
    }

    function test_UploadCid_AlreadyUploaded() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);

        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid, witnesses);

        vm.expectRevert(abi.encodeWithSelector(WillFactory.AlreadyUploaded.selector, cid));
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid, witnesses);
    }

    function test_UploadCid_JsonCidInvalid() public {
        mockJsonCidVerifier.setShouldReturnTrue(false);

        vm.expectRevert(abi.encodeWithSelector(WillFactory.JsonCidInvalid.selector, cid));

        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid, witnesses);
    }

    function test_UploadCid_NotTestator() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);

        vm.expectRevert(abi.encodeWithSelector(WillFactory.NotTestator.selector, random, testator));
        vm.prank(random);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid, witnesses);
    }

    function test_UploadCid_WrongCiphertext() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);

        // Change first element of ciphertext
        willJson.values[3].numberArray[0] = 999;

        vm.expectRevert(WillFactory.WrongCiphertext.selector);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid, witnesses);
    }

    function test_UploadCid_WrongInitializationVector() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);

        // Change first element of IV
        willJson.values[1].numberArray[0] = 888;

        vm.expectRevert(WillFactory.WrongInitializationVector.selector);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid, witnesses);
    }

    function test_UploadCid_CidUploadProofInvalid() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(false);

        vm.expectRevert(WillFactory.CidUploadProofInvalid.selector);

        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid, witnesses);
    }

    function test_RevokeUploadedCid_Success() public {
        // Setup: Upload CID
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid, witnesses);

        vm.expectEmit(true, false, false, true);
        emit WillFactory.UploadedCidRevoked(cid, block.timestamp);

        // Test: Revoke the uploaded CID
        vm.prank(testator);
        factory.revokeUploadedCid(pA, pB, pC, cidUploadPubSignals, cid);

        // Verify: CID is revoked (upload time reset to 0)
        assertEq(factory.cidUploadedTimes(cid), 0);
    }

    function test_RevokeUploadedCid_NotTestator() public {
        // Setup: Upload CID
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid, witnesses);

        // Test: Wrong caller should revert
        vm.expectRevert(abi.encodeWithSelector(WillFactory.NotTestator.selector, random, testator));
        vm.prank(random);
        factory.revokeUploadedCid(pA, pB, pC, cidUploadPubSignals, cid);
    }

    function test_RevokeUploadedCid_CidNotUploaded() public {
        vm.expectRevert(abi.encodeWithSelector(WillFactory.CidNotUploaded.selector, cid));

        vm.prank(testator);
        factory.revokeUploadedCid(pA, pB, pC, cidUploadPubSignals, cid);
    }

    function test_RevokeUploadedCid_AlreadyNotarized() public {
        // Setup: Upload and notarize CID
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid, witnesses);

        vm.warp(block.timestamp + 1);
        vm.prank(notary);
        factory.notarizeCid(cid, _getWitnessSignatures(cid));

        // Test: Should revert because CID is already notarized
        vm.expectRevert(abi.encodeWithSelector(WillFactory.AlreadyNotarized.selector, cid));
        vm.prank(testator);
        factory.revokeUploadedCid(pA, pB, pC, cidUploadPubSignals, cid);
    }

    function test_RevokeUploadedCid_CidUploadProofInvalid() public {
        // Setup: Upload CID
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid, witnesses);

        // Test: Invalid proof should revert
        mockcidUploadVerifier.setShouldReturnTrue(false);
        vm.expectRevert(WillFactory.CidUploadProofInvalid.selector);
        vm.prank(testator);
        factory.revokeUploadedCid(pA, pB, pC, cidUploadPubSignals, cid);
    }

    function test_NotarizeCid_Success() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid, witnesses);

        vm.warp(block.timestamp + 1);

        vm.expectEmit(true, false, false, true);
        emit WillFactory.CidNotarized(cid, block.timestamp);

        vm.prank(notary);
        factory.notarizeCid(cid, _getWitnessSignatures(cid));
    }

    function test_NotarizeCid_NotNotary() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid, witnesses);

        vm.expectRevert(abi.encodeWithSelector(WillFactory.NotNotary.selector, address(this), notary));
        factory.notarizeCid(cid, _getWitnessSignatures(cid));
    }

    function test_NotarizeCid_AlreadyNotarized() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid, witnesses);

        vm.warp(block.timestamp + 1);

        vm.prank(notary);
        factory.notarizeCid(cid, _getWitnessSignatures(cid));

        vm.expectRevert(abi.encodeWithSelector(WillFactory.AlreadyNotarized.selector, cid));
        vm.prank(notary);
        factory.notarizeCid(cid, _getWitnessSignatures(cid));
    }

    function test_NotarizeCid_CidNotUploaded() public {
        vm.expectRevert(abi.encodeWithSelector(WillFactory.CidNotUploaded.selector, cid));

        vm.prank(notary);
        factory.notarizeCid(cid, _getWitnessSignatures(cid));
    }

    function test_ProbateCid_Success() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid, witnesses);

        vm.warp(block.timestamp + 1);

        vm.prank(notary);
        factory.notarizeCid(cid, _getWitnessSignatures(cid));

        vm.warp(block.timestamp + 2);

        vm.expectEmit(true, false, false, true);
        emit WillFactory.CidProbated(cid, block.timestamp);

        vm.prank(oracle);
        factory.probateCid(cid);
    }

    function test_ProbateCid_NotOracle() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid, witnesses);

        vm.warp(block.timestamp + 1);

        vm.prank(notary);
        factory.notarizeCid(cid, _getWitnessSignatures(cid));

        vm.expectRevert(abi.encodeWithSelector(WillFactory.NotOracle.selector, address(this), oracle));
        factory.probateCid(cid);
    }

    function test_ProbateCid_AlreadyProbated() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid, witnesses);

        vm.warp(block.timestamp + 1);

        vm.prank(notary);
        factory.notarizeCid(cid, _getWitnessSignatures(cid));

        vm.warp(block.timestamp + 2);

        vm.prank(oracle);
        factory.probateCid(cid);

        vm.expectRevert(abi.encodeWithSelector(WillFactory.AlreadyProbated.selector, cid));
        vm.prank(oracle);
        factory.probateCid(cid);
    }

    function test_ProbateCid_CidNotNotarized() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid, witnesses);

        vm.expectRevert(abi.encodeWithSelector(WillFactory.CidNotNotarized.selector, cid));
        vm.prank(oracle);
        factory.probateCid(cid);
    }


    function test_CreateWill_Success() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid, witnesses);

        vm.warp(block.timestamp + 1);

        vm.prank(notary);
        factory.notarizeCid(cid, _getWitnessSignatures(cid));

        vm.warp(block.timestamp + 2);

        vm.prank(oracle);
        factory.probateCid(cid);

        mockWillCreationVerifier.setShouldReturnTrue(true);

        address predictedAddress = factory.predictWill(testator, executor, estates, salt);

        vm.expectEmit(true, true, false, true);
        emit WillFactory.WillCreated(cid, testator, predictedAddress);

        vm.prank(executor);
        address willAddress =
            factory.createWill(pA, pB, pC, willCreationPubSignals, willJson, cid);

        assertEq(factory.wills(cid), willAddress);
        assertEq(willAddress, predictedAddress);
    }

    function test_CreateWill_CidNotUploaded() public {
        vm.expectRevert(abi.encodeWithSelector(WillFactory.CidNotUploaded.selector, cid));
        vm.prank(executor);
        factory.createWill(pA, pB, pC, willCreationPubSignals, willJson, cid);
    }

    function test_CreateWill_CidNotNotarized() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid, witnesses);

        vm.expectRevert(abi.encodeWithSelector(WillFactory.CidNotNotarized.selector, cid));
        vm.prank(executor);
        factory.createWill(pA, pB, pC, willCreationPubSignals, willJson, cid);
    }

    function test_CreateWill_CidNotProbated() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid, witnesses);

        vm.warp(block.timestamp + 1);

        vm.prank(notary);
        factory.notarizeCid(cid, _getWitnessSignatures(cid));

        vm.expectRevert(abi.encodeWithSelector(WillFactory.CidNotProbated.selector, cid));
        vm.prank(executor);
        factory.createWill(pA, pB, pC, willCreationPubSignals, willJson, cid);
    }

    function test_CreateWill_WrongCiphertext() public {
        // Setup: Upload, notarize, and probate the CID first
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid, witnesses);

        vm.warp(block.timestamp + 1);

        vm.prank(notary);
        factory.notarizeCid(cid, _getWitnessSignatures(cid));

        vm.warp(block.timestamp + 2);

        vm.prank(oracle);
        factory.probateCid(cid);

        mockWillCreationVerifier.setShouldReturnTrue(true);

         // Change first element of ciphertext
        willJson.values[3].numberArray[0] = 777;

        vm.expectRevert(WillFactory.WrongCiphertext.selector);
        vm.prank(executor);
        factory.createWill(pA, pB, pC, willCreationPubSignals, willJson, cid);
    }

    function test_CreateWill_WrongInitializationVector() public {
        // Setup: Upload, notarize, and probate the CID first
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid, witnesses);

        vm.warp(block.timestamp + 1);

        vm.prank(notary);
        factory.notarizeCid(cid, _getWitnessSignatures(cid));

        vm.warp(block.timestamp + 2);

        vm.prank(oracle);
        factory.probateCid(cid);

        mockWillCreationVerifier.setShouldReturnTrue(true);

        // Change first element of IV
        willJson.values[1].numberArray[0] = 666;

        vm.expectRevert(WillFactory.WrongInitializationVector.selector);
        vm.prank(executor);
        factory.createWill(pA, pB, pC, willCreationPubSignals, willJson, cid);
    }

    function test_CreateWill_WillCreationProofInvalid() public {
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid, witnesses);

        vm.warp(block.timestamp + 1);

        vm.prank(notary);
        factory.notarizeCid(cid, _getWitnessSignatures(cid));

        vm.warp(block.timestamp + 2);

        vm.prank(oracle);
        factory.probateCid(cid);

        mockWillCreationVerifier.setShouldReturnTrue(false);

        vm.expectRevert(WillFactory.WillCreationProofInvalid.selector);
        vm.prank(executor);
        factory.createWill(pA, pB, pC, willCreationPubSignals, willJson, cid);
    }

    function test_CreateWill_WillAlreadyExists() public {
        // Upload, notarize, and probate Cid
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        mockWillCreationVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid, witnesses);

        vm.warp(block.timestamp + 1);

        vm.prank(notary);
        factory.notarizeCid(cid, _getWitnessSignatures(cid));

        vm.warp(block.timestamp + 2);

        vm.prank(oracle);
        factory.probateCid(cid);

        // Create first will
        vm.prank(executor);
        address firstWill =
            factory.createWill(pA, pB, pC, willCreationPubSignals, willJson, cid);

        // Try to create second will with same Cid
        vm.expectRevert(abi.encodeWithSelector(WillFactory.WillAlreadyExists.selector, cid, firstWill));
        vm.prank(executor);
        factory.createWill(pA, pB, pC, willCreationPubSignals, willJson, cid);
    }

    function test_RevokeNortarizedCid_Success() public {
        // Setup: Upload and notarize CID
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid, witnesses);

        vm.warp(block.timestamp + 1);
        vm.prank(notary);
        factory.notarizeCid(cid, _getWitnessSignatures(cid));

        vm.expectEmit(true, false, false, true);
        emit WillFactory.NotarizedCidRevoked(cid, block.timestamp);

        // Test: Revoke the notarized CID
        vm.prank(notary);
        factory.revokeNortarizedCid(cid);

        // Verify: Only notarization times is reset to 0
        assertTrue(factory.cidUploadedTimes(cid) > 0);
        assertEq(factory.cidNotarizedTimes(cid), 0);
    }

    function test_RevokeNortarizedCid_NotNotary() public {
        // Setup: Upload and notarize CID
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid, witnesses);

        vm.warp(block.timestamp + 1);
        vm.prank(notary);
        factory.notarizeCid(cid, _getWitnessSignatures(cid));

        vm.expectRevert(abi.encodeWithSelector(WillFactory.NotNotary.selector, testator, notary));
        vm.prank(testator);
        factory.revokeNortarizedCid(cid);
    }

    function test_RevokeNortarizedCid_CidNotNotarized() public {
        // Setup: Upload CID but don't notarize
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid, witnesses);

        vm.expectRevert(abi.encodeWithSelector(WillFactory.CidNotNotarized.selector, cid));
        vm.prank(notary);
        factory.revokeNortarizedCid(cid);
    }

    function test_RevokeNortarizedCid_AlreadyProbated() public {
        // Setup: Upload, notarize, and probate CID
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid, witnesses);

        vm.warp(block.timestamp + 1);
        vm.prank(notary);
        factory.notarizeCid(cid, _getWitnessSignatures(cid));

        vm.warp(block.timestamp + 2);
        vm.prank(oracle);
        factory.probateCid(cid);

        vm.expectRevert(abi.encodeWithSelector(WillFactory.AlreadyProbated.selector, cid));
        vm.prank(notary);
        factory.revokeNortarizedCid(cid);
    }

    function test_RevokeProbatedCid_Success() public {
        // Setup: Upload, notarize, and probate CID
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid, witnesses);

        vm.warp(block.timestamp + 1);
        vm.prank(notary);
        factory.notarizeCid(cid, _getWitnessSignatures(cid));

        vm.warp(block.timestamp + 2);
        vm.prank(oracle);
        factory.probateCid(cid);

        vm.expectEmit(true, false, false, true);
        emit WillFactory.ProbatedCidRevoked(cid, block.timestamp);

        // Test: Revoke the probated CID
        vm.prank(oracle);
        factory.revokeProbatedCid(cid);

        // Verify: Only probation times are reset to 0
        assertTrue(factory.cidUploadedTimes(cid) > 0);
        assertTrue(factory.cidNotarizedTimes(cid) > factory.cidUploadedTimes(cid));
        assertEq(factory.cidProbatedTimes(cid), 0);
    }

    function test_RevokeProbatedCid_NotOracle() public {
        // Setup: Upload, notarize, and probate CID
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid, witnesses);

        vm.warp(block.timestamp + 1);
        vm.prank(notary);
        factory.notarizeCid(cid, _getWitnessSignatures(cid));

        vm.warp(block.timestamp + 2);
        vm.prank(oracle);
        factory.probateCid(cid);

        vm.expectRevert(abi.encodeWithSelector(WillFactory.NotOracle.selector, testator, oracle));
        vm.prank(testator);
        factory.revokeProbatedCid(cid);
    }

    function test_RevokeProbatedCid_CidNotProbated() public {
        // Setup: Upload and notarize CID but don't probate
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid, witnesses);

        vm.warp(block.timestamp + 1);
        vm.prank(notary);
        factory.notarizeCid(cid, _getWitnessSignatures(cid));

        vm.expectRevert(abi.encodeWithSelector(WillFactory.CidNotProbated.selector, cid));
        vm.prank(oracle);
        factory.revokeProbatedCid(cid);
    }

    function test_NotarizeCid_InvalidWitnessSignature() public {
        // Setup: Upload CID
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid, witnesses);

        vm.warp(block.timestamp + 1);

        // Create invalid signatures (signed with wrong private key)
        uint256 wrongPrivateKey = 0x9999999999999999999999999999999999999999999999999999999999999999;
        bytes[2] memory invalidSignatures;
        invalidSignatures[0] = _signCidAsWitness(cid, wrongPrivateKey);
        invalidSignatures[1] = _signCidAsWitness(cid, wrongPrivateKey);

        vm.expectRevert();
        vm.prank(notary);
        factory.notarizeCid(cid, invalidSignatures);
    }

    function test_NotarizeCid_WrongWitnessOrder() public {
        // Setup: Upload CID
        mockJsonCidVerifier.setShouldReturnTrue(true);
        mockcidUploadVerifier.setShouldReturnTrue(true);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, cidUploadPubSignals, willJson, cid, witnesses);

        vm.warp(block.timestamp + 1);

        // Create signatures in wrong order
        bytes[2] memory wrongOrderSignatures;
        wrongOrderSignatures[0] = _signCidAsWitness(cid, witness2PrivateKey); // Should be witness1
        wrongOrderSignatures[1] = _signCidAsWitness(cid, witness1PrivateKey); // Should be witness2

        vm.expectRevert();
        vm.prank(notary);
        factory.notarizeCid(cid, wrongOrderSignatures);
    }
}
