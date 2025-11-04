// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/Vm.sol";
import "forge-std/console.sol";
import "src/WillFactory.sol";
import "src/Will.sol";
import "src/CidUploadVerifier.sol";
import "src/WillCreationVerifier.sol";
import "src/JsonCidVerifier.sol";
import "helpers/TestHelpers.sol";


/*
 * @note Prerequisite for this test:
 *  1. `make fork` a virtual env
 *  2. `make deploy` necessary contracts
 *  3. `make all` in apps/backend to generate test data (e.g., encrypted will, ZKP).
 */
contract WillFactoryIntegrationTest is TestHelpers {

    WillFactory willFactory;
    CidUploadVerifier cidUploadVerifier;
    WillCreationVerifier willCreateVerifier;
    JsonCidVerifier jsonCidVerifier;

    address notary;
    address oracle;
    address permit2;
    uint8 maxEstates;
    address random = makeAddr("random");
    address witness1;
    uint256 witness1PrivateKey;
    address witness2;
    uint256 witness2PrivateKey;
    address[2] witnesses;

    struct TestVector {
        string name;
        address testator;
        address executor;
        Will.Estate[] estates;
        uint256 salt;
        JsonCidVerifier.TypedJsonObject willTypedJsonObj;
        string cid;
        CidUploadProofData cidUploadProof;
        WillCreationProofData willCreationProof;
    }

    TestVector[] testVectors;

    function setUp() public {
        witness1PrivateKey = 0x2345678901234567890123456789012345678901234567890123456789012345;
        witness1 = vm.addr(witness1PrivateKey);
        witness2PrivateKey = 0x3456789012345678901234567890123456789012345678901234567890123456;
        witness2 = vm.addr(witness2PrivateKey);
        witnesses = [witness1, witness2];

        CidUploadVerifierConstants1 cidUploadConstants1 = new CidUploadVerifierConstants1();
        CidUploadVerifierConstants2 cidUploadConstants2 = new CidUploadVerifierConstants2();
        cidUploadVerifier = new CidUploadVerifier(address(cidUploadConstants1), address(cidUploadConstants2));
        WillCreationVerifierConstants1 willCreationConstants1 = new WillCreationVerifierConstants1();
        WillCreationVerifierConstants2 willCreationConstants2 = new WillCreationVerifierConstants2();
        willCreateVerifier = new WillCreationVerifier(address(willCreationConstants1), address(willCreationConstants2));
        jsonCidVerifier = new JsonCidVerifier();

        notary = vm.envAddress("NOTARY");
        oracle = vm.envAddress("ORACLE");
        permit2 = vm.envAddress("PERMIT2");
        maxEstates = uint8(vm.envUint("MAX_ESTATES"));

        willFactory = new WillFactory(
            address(cidUploadVerifier), address(willCreateVerifier), address(jsonCidVerifier), notary, oracle, permit2, maxEstates
        );

        _setupTestVectors();
    }

    function _setupTestVectors() internal {
        {
            JsonCidVerifier.TypedJsonObject memory willTypedJsonObj = _getEncryptedWillFromFile();
            CidUploadProofData memory cidUploadProof = _getCidUploadProofFromFiles();
            WillCreationProofData memory willCreationProof = _getWillCreationProofFromFiles();

            (
                address testator,
                address executor,
                Will.Estate[] memory estates,
                uint256 salt,
                string memory cid
            ) = _getTestDataFromEnv();

            testVectors.push(
                TestVector({
                    name: "20251104 Will",
                    testator: testator,
                    executor: executor,
                    estates: estates,
                    salt: salt,
                    willTypedJsonObj: willTypedJsonObj,
                    cid: cid,
                    cidUploadProof: cidUploadProof,
                    willCreationProof: willCreationProof
                })
            );
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

    function test_FullWorkflow_UploadNotarizeProbateCreate() public {
        TestVector memory tv = testVectors[0];

        // Step 1: Upload CID
        vm.expectEmit(true, false, false, true);
        emit WillFactory.CidUploaded(tv.cid, block.timestamp);

        vm.prank(tv.testator);
        willFactory.uploadCid(
            tv.cidUploadProof.pA,
            tv.cidUploadProof.pB,
            tv.cidUploadProof.pC,
            tv.cidUploadProof.pubSignals,
            tv.willTypedJsonObj,
            tv.cid,
            witnesses
        );

        // Verify upload
        uint256 uploadTime = willFactory.cidUploadedTimes(tv.cid);
        assertEq(uploadTime, block.timestamp);

        // Step 2: Notarize CID
        vm.warp(block.timestamp + 1);

        vm.expectRevert(abi.encodeWithSelector(WillFactory.NotNotary.selector, random, notary));
        vm.prank(random);
        willFactory.notarizeCid(tv.cid, _getWitnessSignatures(tv.cid));

        vm.expectEmit(true, false, false, true);
        emit WillFactory.CidNotarized(tv.cid, block.timestamp);

        vm.prank(notary);
        willFactory.notarizeCid(tv.cid, _getWitnessSignatures(tv.cid));

        // Verify notarization
        uint256 notarizeTime = willFactory.cidNotarizedTimes(tv.cid);
        assertEq(notarizeTime, block.timestamp);
        assertTrue(notarizeTime > uploadTime);

        // Step 3: Probate Will
        vm.warp(block.timestamp + 1);

        vm.expectRevert(abi.encodeWithSelector(WillFactory.NotOracle.selector, random, oracle));
        vm.prank(random);
        willFactory.probateCid(tv.cid);

        vm.expectEmit(true, false, false, true);
        emit WillFactory.CidProbated(tv.cid, block.timestamp);

        vm.prank(oracle);
        willFactory.probateCid(tv.cid);

        // Verify probation
        uint256 probateTime = willFactory.cidProbatedTimes(tv.cid);
        assertEq(probateTime, block.timestamp);
        assertTrue(probateTime > notarizeTime);

        // Step 4: Create Will
        address predictedAddress = willFactory.predictWill(tv.testator, tv.executor, tv.estates, tv.salt);

        vm.expectRevert(abi.encodeWithSelector(WillFactory.NotExecutor.selector, random, tv.executor));
        vm.prank(random);
        willFactory.createWill(
            tv.willCreationProof.pA,
            tv.willCreationProof.pB,
            tv.willCreationProof.pC,
            tv.willCreationProof.pubSignals,
            tv.willTypedJsonObj,
            tv.cid
        );

        vm.expectEmit(true, true, false, true);
        emit WillFactory.WillCreated(tv.cid, tv.testator, predictedAddress);

        vm.prank(tv.executor);
        address willAddress = willFactory.createWill(
            tv.willCreationProof.pA,
            tv.willCreationProof.pB,
            tv.willCreationProof.pC,
            tv.willCreationProof.pubSignals,
            tv.willTypedJsonObj,
            tv.cid
        );

        // Verify will creation
        assertEq(willFactory.wills(tv.cid), willAddress);
        assertEq(willAddress, predictedAddress);

        // Verify will contract exists and has correct properties
        Will will = Will(willAddress);
        assertEq(address(will.permit2()), permit2);
        assertEq(will.testator(), tv.testator);
        assertEq(will.executor(), tv.executor);

        assertTrue(_compareEstateArraysHash(will.getAllEstates(), tv.estates));
    }

    function test_WorkflowWithTimingConstraints() public {
        TestVector memory tv = testVectors[0];

        // Upload at time T
        vm.prank(tv.testator);
        willFactory.uploadCid(
            tv.cidUploadProof.pA,
            tv.cidUploadProof.pB,
            tv.cidUploadProof.pC,
            tv.cidUploadProof.pubSignals,
            tv.willTypedJsonObj,
            tv.cid,
            witnesses
        );

        // Try to probate will without notarization - should fail
        vm.expectRevert(abi.encodeWithSelector(WillFactory.CidNotNotarized.selector, tv.cid));
        vm.prank(oracle);
        willFactory.probateCid(tv.cid);

        // Notarize at time T (same as upload) - should fail
        vm.expectRevert(abi.encodeWithSelector(WillFactory.CidNotUploaded.selector, tv.cid));
        vm.prank(notary);
        willFactory.notarizeCid(tv.cid, _getWitnessSignatures(tv.cid));

        // Fast forward time and re-upload - should fail
        vm.warp(block.timestamp + 1);
        vm.expectRevert(abi.encodeWithSelector(WillFactory.AlreadyUploaded.selector, tv.cid));
        vm.prank(tv.testator);
        willFactory.uploadCid(
            tv.cidUploadProof.pA,
            tv.cidUploadProof.pB,
            tv.cidUploadProof.pC,
            tv.cidUploadProof.pubSignals,
            tv.willTypedJsonObj,
            tv.cid,
            witnesses
        );
        
        // Notarize after upload - should success
        vm.prank(notary);
        willFactory.notarizeCid(tv.cid, _getWitnessSignatures(tv.cid));

        // Try to create will without probation - should fail
        vm.expectRevert(abi.encodeWithSelector(WillFactory.CidNotProbated.selector, tv.cid));
        vm.prank(tv.executor);
        willFactory.createWill(
            tv.willCreationProof.pA,
            tv.willCreationProof.pB,
            tv.willCreationProof.pC,
            tv.willCreationProof.pubSignals,
            tv.willTypedJsonObj,
            tv.cid
        );

        // Probate at time T (same as notarize) - should fail
        vm.expectRevert(abi.encodeWithSelector(WillFactory.CidNotNotarized.selector, tv.cid));
        vm.prank(oracle);
        willFactory.probateCid(tv.cid);

        // Fast forward time and re-notarize - should fail
        vm.warp(block.timestamp + 1);
        vm.expectRevert(abi.encodeWithSelector(WillFactory.AlreadyNotarized.selector, tv.cid));
        vm.prank(notary);
        willFactory.notarizeCid(tv.cid, _getWitnessSignatures(tv.cid));

        // Probate after notarization - should success
        vm.prank(oracle);
        willFactory.probateCid(tv.cid);

        // Fast forward time and re-notarize - should fail
        vm.warp(block.timestamp + 1);
        vm.expectRevert(abi.encodeWithSelector(WillFactory.AlreadyProbated.selector, tv.cid));
        vm.prank(oracle);
        willFactory.probateCid(tv.cid);

        // Create Will with "probation time > notarization time > upload time" - should success
        vm.prank(tv.executor);
        address willAddress = willFactory.createWill(
            tv.willCreationProof.pA,
            tv.willCreationProof.pB,
            tv.willCreationProof.pC,
            tv.willCreationProof.pubSignals,
            tv.willTypedJsonObj,
            tv.cid
        );

        assertEq(willFactory.wills(tv.cid), willAddress);
    }

    function test_RevokeUploadedCid() public {
        TestVector memory tv = testVectors[0];

        // Step 1: Upload CID
        vm.prank(tv.testator);
        willFactory.uploadCid(
            tv.cidUploadProof.pA,
            tv.cidUploadProof.pB,
            tv.cidUploadProof.pC,
            tv.cidUploadProof.pubSignals,
            tv.willTypedJsonObj,
            tv.cid,
            witnesses
        );

        // Verify upload
        uint256 uploadTime = willFactory.cidUploadedTimes(tv.cid);
        assertEq(uploadTime, block.timestamp);

        // Step 2: Revoke the uploaded CID
        vm.expectEmit(true, false, false, true);
        emit WillFactory.UploadedCidRevoked(tv.cid, block.timestamp);

        vm.prank(tv.testator);
        willFactory.revokeUploadedCid(
            tv.cidUploadProof.pA,
            tv.cidUploadProof.pB,
            tv.cidUploadProof.pC,
            tv.cidUploadProof.pubSignals,
            tv.cid
        );

        // Verify revocation - upload time should be reset to 0
        assertEq(willFactory.cidUploadedTimes(tv.cid), 0);

        // Step 3: Verify that after revocation, we can upload the same CID again
        vm.warp(block.timestamp + 1);
        vm.prank(tv.testator);
        willFactory.uploadCid(
            tv.cidUploadProof.pA,
            tv.cidUploadProof.pB,
            tv.cidUploadProof.pC,
            tv.cidUploadProof.pubSignals,
            tv.willTypedJsonObj,
            tv.cid,
            witnesses
        );

        uint256 newUploadTime = willFactory.cidUploadedTimes(tv.cid);
        assertEq(newUploadTime, block.timestamp);
        assertTrue(newUploadTime > uploadTime);

        // Try to revoke notarized CID with revokeUploadedCid - should fail
        vm.warp(block.timestamp + 1);
        vm.prank(notary);
        willFactory.notarizeCid(tv.cid, _getWitnessSignatures(tv.cid));
        
        vm.expectRevert(abi.encodeWithSelector(WillFactory.AlreadyNotarized.selector, tv.cid));
        vm.prank(tv.testator);
        willFactory.revokeUploadedCid(
            tv.cidUploadProof.pA,
            tv.cidUploadProof.pB,
            tv.cidUploadProof.pC,
            tv.cidUploadProof.pubSignals,
            tv.cid
        );
    }

    function test_RevokeNortarizedCid() public {
        TestVector memory tv = testVectors[0];

        // Step 1: Upload CID
        vm.prank(tv.testator);
        willFactory.uploadCid(
            tv.cidUploadProof.pA,
            tv.cidUploadProof.pB,
            tv.cidUploadProof.pC,
            tv.cidUploadProof.pubSignals,
            tv.willTypedJsonObj,
            tv.cid,
            witnesses
        );

        // Step 2: Notarize CID
        vm.warp(block.timestamp + 1);
        vm.prank(notary);
        willFactory.notarizeCid(tv.cid, _getWitnessSignatures(tv.cid));

        // Verify notarization
        uint256 notarizeTime = willFactory.cidNotarizedTimes(tv.cid);
        assertTrue(notarizeTime > 0);

        // Step 3: Revoke the notarized CID
        vm.expectEmit(true, false, false, true);
        emit WillFactory.NotarizedCidRevoked(tv.cid, block.timestamp);

        vm.prank(notary);
        willFactory.revokeNortarizedCid(tv.cid);

        // Verify revocation - notarize time should be reset to 0
        assertTrue(willFactory.cidUploadedTimes(tv.cid) > 0);
        assertEq(willFactory.cidNotarizedTimes(tv.cid), 0);

        // Step 4: Verify that after revocation, we can notarize the same CID again
        vm.warp(block.timestamp + 1);
        vm.prank(notary);
        willFactory.notarizeCid(tv.cid, _getWitnessSignatures(tv.cid));

        // Verify re-notarization worked
        uint256 newNotarizeTime = willFactory.cidNotarizedTimes(tv.cid);
        assertEq(newNotarizeTime, block.timestamp);
        assertTrue(willFactory.cidUploadedTimes(tv.cid) > 0);
        assertTrue(willFactory.cidNotarizedTimes(tv.cid) > willFactory.cidUploadedTimes(tv.cid));
        assertTrue(newNotarizeTime > notarizeTime);

        // Try to revoke probated CID with revokeNotarizedCid - should fail
        vm.warp(block.timestamp + 1);
        vm.prank(oracle);
        willFactory.probateCid(tv.cid);
        
        vm.expectRevert(abi.encodeWithSelector(WillFactory.AlreadyProbated.selector, tv.cid));
        vm.prank(notary);
        willFactory.revokeNortarizedCid(tv.cid);
    }

    function test_RevokeProbatedCid() public {
        TestVector memory tv = testVectors[0];

        // Step 1: Upload CID
        vm.prank(tv.testator);
        willFactory.uploadCid(
            tv.cidUploadProof.pA,
            tv.cidUploadProof.pB,
            tv.cidUploadProof.pC,
            tv.cidUploadProof.pubSignals,
            tv.willTypedJsonObj,
            tv.cid,
            witnesses
        );

        // Step 2: Notarize CID
        vm.warp(block.timestamp + 1);
        vm.prank(notary);
        willFactory.notarizeCid(tv.cid, _getWitnessSignatures(tv.cid));

        // Step 3: Probate CID
        vm.warp(block.timestamp + 1);
        vm.prank(oracle);
        willFactory.probateCid(tv.cid);

        // Verify probation
        uint256 probateTime = willFactory.cidProbatedTimes(tv.cid);
        assertTrue(probateTime > 0);

        // Step 4: Revoke the probated CID
        vm.expectEmit(true, false, false, true);
        emit WillFactory.ProbatedCidRevoked(tv.cid, block.timestamp);

        vm.prank(oracle);
        willFactory.revokeProbatedCid(tv.cid);

        // Verify revocation - all times should be reset to 0
        assertTrue(willFactory.cidUploadedTimes(tv.cid) > 0);
        assertTrue(willFactory.cidNotarizedTimes(tv.cid) > 0);
        assertEq(willFactory.cidProbatedTimes(tv.cid), 0);

        // Step 5: Verify that after revocation, we can probate the same CID again
        vm.warp(block.timestamp + 1);
        vm.prank(oracle);
        willFactory.probateCid(tv.cid);

        // Verify re-probation worked
        uint256 newProbateTime = willFactory.cidProbatedTimes(tv.cid);
        assertTrue(willFactory.cidUploadedTimes(tv.cid) > 0);
        assertTrue(willFactory.cidNotarizedTimes(tv.cid) > willFactory.cidUploadedTimes(tv.cid));
        assertTrue(willFactory.cidProbatedTimes(tv.cid) > willFactory.cidNotarizedTimes(tv.cid));
        assertTrue(newProbateTime > probateTime);
    }

    function _getTestDataFromEnv() internal view returns (
        address testator,
        address executor,
        Will.Estate[] memory estates,
        uint256 salt,
        string memory cid
    ) {
        // Read values from environment variables
        testator = vm.envAddress("TESTATOR");
        executor = vm.envAddress("EXECUTOR");

        estates = new Will.Estate[](maxEstates);
        estates[0] = Will.Estate({
            beneficiary: vm.envAddress("BENEFICIARY0"),
            token: vm.envAddress("TOKEN0"),
            amount: vm.envUint("AMOUNT0")
        });

        estates[1] = Will.Estate({
            beneficiary: vm.envAddress("BENEFICIARY1"),
            token: vm.envAddress("TOKEN1"),
            amount: vm.envUint("AMOUNT1")
        });

        salt = vm.envUint("SALT");
        cid = vm.envString("CID");
    }

    function _compareEstateArraysHash(Will.Estate[] memory estates0, Will.Estate[] memory estates1)
        public
        pure
        returns (bool)
    {
        return keccak256(abi.encode(estates0)) == keccak256(abi.encode(estates1));
    }
}
