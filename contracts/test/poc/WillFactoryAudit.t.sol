// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "src/WillFactory.sol";
import "src/Will.sol";
import "src/JsonCidVerifier.sol";
import "mock/MockSoundCidUploadVerifier.sol";
import "mock/MockWillCreationVerifier.sol";

/*
 * @title WillFactory contract-layer audit PoCs
 * @dev - CidUpload proofs are modelled by MockSoundCidUploadVerifier (only legitimately issued
 *        public signals verify), i.e. the post-fix, sound cidUpload circuit.
 *      - WillCreation proofs are modelled by an accept-all verifier, i.e. the pre-fix,
 *        under-constrained willCreation circuit whose public outputs could be forged.
 *      - CIDs are computed by the real JsonCidVerifier, so `_will` <-> `_cid` binding is real.
 */
contract WillFactoryAuditPoC is Test {
    WillFactory factory;
    MockSoundCidUploadVerifier cidUploadVerifier;
    MockWillCreationVerifier willCreationVerifier;
    JsonCidVerifier jsonCidVerifier;

    address notary = makeAddr("notary");
    address oracle = makeAddr("oracle");
    address permit2 = makeAddr("permit2");
    uint8 constant MAX_ESTATES = 2;

    uint256 witness1PrivateKey = 0x2345678901234567890123456789012345678901234567890123456789012345;
    uint256 witness2PrivateKey = 0x3456789012345678901234567890123456789012345678901234567890123456;
    address[2] witnesses;

    address victim = makeAddr("victim");
    address victimExecutor = makeAddr("victimExecutor");
    address attacker = makeAddr("attacker");

    uint256[2] pA;
    uint256[2][2] pB;
    uint256[2] pC;

    struct Upload {
        JsonCidVerifier.TypedJsonObject json;
        string cid;
        uint256[310] pubSignals;
    }

    function setUp() public {
        witnesses = [vm.addr(witness1PrivateKey), vm.addr(witness2PrivateKey)];
        cidUploadVerifier = new MockSoundCidUploadVerifier();
        willCreationVerifier = new MockWillCreationVerifier();
        jsonCidVerifier = new JsonCidVerifier();
        factory = new WillFactory(
            address(cidUploadVerifier),
            address(willCreationVerifier),
            address(jsonCidVerifier),
            notary,
            oracle,
            permit2,
            MAX_ESTATES
        );
    }

    /* ------------------------------------------------------------------ */
    /*                               Helpers                              */
    /* ------------------------------------------------------------------ */

    function _bytesArray(uint256 seed, uint256 len) internal pure returns (uint256[] memory arr) {
        arr = new uint256[](len);
        for (uint256 i = 0; i < len; i++) {
            arr[i] = uint8(uint256(keccak256(abi.encode(seed, i))));
        }
    }

    function _encryptedWill(uint256 seed) internal pure returns (JsonCidVerifier.TypedJsonObject memory json) {
        json.keys = new string[](5);
        json.values = new JsonCidVerifier.JsonValue[](5);
        json.keys[0] = "algorithm";
        json.keys[1] = "iv";
        json.keys[2] = "authTag";
        json.keys[3] = "ciphertext";
        json.keys[4] = "timestamp";
        json.values[0] = JsonCidVerifier.JsonValue("aes-256-gcm", new uint256[](0), JsonCidVerifier.JsonValueType.STRING);
        json.values[1] = JsonCidVerifier.JsonValue("", _bytesArray(seed, 16), JsonCidVerifier.JsonValueType.NUMBER_ARRAY);
        json.values[2] =
            JsonCidVerifier.JsonValue("", _bytesArray(seed + 1, 16), JsonCidVerifier.JsonValueType.NUMBER_ARRAY);
        json.values[3] =
            JsonCidVerifier.JsonValue("", _bytesArray(seed + 2, 293), JsonCidVerifier.JsonValueType.NUMBER_ARRAY);
        json.values[4] = JsonCidVerifier.JsonValue("1760000000", new uint256[](0), JsonCidVerifier.JsonValueType.NUMBER);
    }

    function _cidUploadPubSignals(address testator, JsonCidVerifier.TypedJsonObject memory json)
        internal
        pure
        returns (uint256[310] memory pub)
    {
        uint256 idx = 0;
        pub[idx++] = uint160(testator);
        for (uint256 i = 0; i < 16; i++) {
            pub[idx++] = json.values[1].numberArray[i];
        }
        for (uint256 i = 0; i < 293; i++) {
            pub[idx++] = json.values[3].numberArray[i];
        }
    }

    function _willCreationPubSignals(
        address testator,
        address executor,
        uint256 salt,
        JsonCidVerifier.TypedJsonObject memory json
    ) internal returns (uint256[321] memory pub) {
        uint256 idx = 0;
        pub[idx++] = uint160(testator);
        pub[idx++] = uint160(executor);
        for (uint256 i = 0; i < MAX_ESTATES; i++) {
            pub[idx++] = uint160(makeAddr(string.concat("beneficiary", vm.toString(i))));
            pub[idx++] = uint160(makeAddr(string.concat("token", vm.toString(i))));
            pub[idx++] = 1000 * (i + 1);
        }
        pub[idx++] = uint64(salt);
        pub[idx++] = uint64(salt >> 64);
        pub[idx++] = uint64(salt >> 128);
        pub[idx++] = uint64(salt >> 192);
        for (uint256 i = 0; i < 16; i++) {
            pub[idx++] = json.values[1].numberArray[i];
        }
        for (uint256 i = 0; i < 293; i++) {
            pub[idx++] = json.values[3].numberArray[i];
        }
    }

    /// @dev testator legitimately encrypts a will, obtains a (sound) proof and uploads it.
    function _upload(address testator, uint256 seed) internal returns (Upload memory u) {
        u.json = _encryptedWill(seed);
        u.cid = jsonCidVerifier.generateCidString(u.json);
        u.pubSignals = _cidUploadPubSignals(testator, u.json);
        cidUploadVerifier.issue(u.pubSignals);
        vm.prank(testator);
        factory.uploadCid(pA, pB, pC, u.pubSignals, u.json, u.cid, witnesses);
    }

    function _witnessSignatures(string memory cid) internal view returns (bytes[2] memory sigs) {
        bytes32 digest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", keccak256(abi.encodePacked(cid))));
        uint256[2] memory keys = [witness1PrivateKey, witness2PrivateKey];
        for (uint256 i = 0; i < 2; i++) {
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(keys[i], digest);
            sigs[i] = abi.encodePacked(r, s, v);
        }
    }

    function _notarizeAndProbate(string memory cid) internal {
        vm.warp(vm.getBlockTimestamp() + 1);
        vm.prank(notary);
        factory.notarizeCid(cid, _witnessSignatures(cid));
        vm.warp(vm.getBlockTimestamp() + 1);
        vm.prank(oracle);
        factory.probateCid(cid);
    }

    /* ------------------------------------------------------------------ */
    /*  #1 revokeUploadedCid does not bind the proof / caller to `_cid`    */
    /* ------------------------------------------------------------------ */

    function test_PoC1_RevokeUploadedCid_RejectsOtherTestatorsValidProof() public {
        Upload memory victimUpload = _upload(victim, 1);
        Upload memory attackerUpload = _upload(attacker, 2); // attacker's own, perfectly valid proof

        vm.expectRevert(abi.encodeWithSelector(WillFactory.NotTestator.selector, attacker, victim));
        vm.prank(attacker);
        factory.revokeUploadedCid(pA, pB, pC, attackerUpload.pubSignals, victimUpload.cid);

        assertGt(factory.cidUploadedTimes(victimUpload.cid), 0, "victim's CID must stay uploaded");
    }

    function test_PoC1_RevokeUploadedCid_UploaderCanStillRevoke() public {
        Upload memory victimUpload = _upload(victim, 1);

        vm.prank(victim);
        factory.revokeUploadedCid(pA, pB, pC, victimUpload.pubSignals, victimUpload.cid);

        assertEq(factory.cidUploadedTimes(victimUpload.cid), 0);
    }

    /* ------------------------------------------------------------------ */
    /*  #2 createWill: CID binding and squatting with forged public signals */
    /* ------------------------------------------------------------------ */

    /// @dev (a) iv/ciphertext public signals are bound to `_cid` through `_will` + JsonCidVerifier.
    function test_PoC2a_CreateWill_RejectsCiphertextNotInCid() public {
        Upload memory victimUpload = _upload(victim, 1);
        _notarizeAndProbate(victimUpload.cid);

        uint256[321] memory pub = _willCreationPubSignals(victim, attacker, 0, _encryptedWill(99));

        vm.expectRevert(WillFactory.WrongInitializationVector.selector);
        vm.prank(attacker);
        factory.createWill(pA, pB, pC, pub, victimUpload.json, victimUpload.cid);
    }

    /// @dev (b) RESIDUAL RISK, asserts the attack succeeds: with an unsound willCreation circuit the
    ///      contract cannot tell a forged executor apart, so an attacker can permanently squat
    ///      `wills[_cid]`. Only circuit soundness prevents this; the contract has nothing to compare
    ///      the executor against.
    function test_PoC2b_UnsoundCircuit_ForgedExecutorSquatsProbatedCid() public {
        Upload memory victimUpload = _upload(victim, 1);
        _notarizeAndProbate(victimUpload.cid);

        uint256[321] memory forged = _willCreationPubSignals(victim, attacker, 1, victimUpload.json);
        vm.prank(attacker);
        address squatted = factory.createWill(pA, pB, pC, forged, victimUpload.json, victimUpload.cid);
        assertEq(Will(squatted).executor(), attacker);

        uint256[321] memory honest = _willCreationPubSignals(victim, victimExecutor, 2, victimUpload.json);
        vm.expectRevert(abi.encodeWithSelector(WillFactory.WillAlreadyExists.selector, victimUpload.cid, squatted));
        vm.prank(victimExecutor);
        factory.createWill(pA, pB, pC, honest, victimUpload.json, victimUpload.cid);

        // The oracle cannot recover the CID either.
        vm.expectRevert(abi.encodeWithSelector(WillFactory.WillAlreadyExists.selector, victimUpload.cid, squatted));
        vm.prank(oracle);
        factory.revokeProbatedCid(victimUpload.cid);
    }

    /// @dev (c) defence in depth: the will's testator must be the account that uploaded the CID.
    function test_PoC2c_CreateWill_RejectsTestatorOtherThanUploader() public {
        Upload memory victimUpload = _upload(victim, 1);
        _notarizeAndProbate(victimUpload.cid);

        uint256[321] memory forged = _willCreationPubSignals(attacker, attacker, 1, victimUpload.json);

        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("TestatorMismatch(address,address)")), attacker, victim));
        vm.prank(attacker);
        factory.createWill(pA, pB, pC, forged, victimUpload.json, victimUpload.cid);
    }

    /* ------------------------------------------------------------------ */
    /*  #3 uploadCid bypass attempts (sound circuit)                        */
    /* ------------------------------------------------------------------ */

    function test_PoC3_UploadCid_RejectsReplayedProofFromFrontRunner() public {
        JsonCidVerifier.TypedJsonObject memory json = _encryptedWill(1);
        string memory cid = jsonCidVerifier.generateCidString(json);
        uint256[310] memory pub = _cidUploadPubSignals(victim, json);
        cidUploadVerifier.issue(pub);

        vm.expectRevert(abi.encodeWithSelector(WillFactory.NotTestator.selector, attacker, victim));
        vm.prank(attacker);
        factory.uploadCid(pA, pB, pC, pub, json, cid, witnesses);
    }

    function test_PoC3_UploadCid_RejectsClaimingSomeoneElsesCiphertext() public {
        JsonCidVerifier.TypedJsonObject memory json = _encryptedWill(1);
        string memory cid = jsonCidVerifier.generateCidString(json);
        uint256[310] memory pub = _cidUploadPubSignals(attacker, json); // never issued: attacker lacks key + signature

        vm.expectRevert(WillFactory.CidUploadProofInvalid.selector);
        vm.prank(attacker);
        factory.uploadCid(pA, pB, pC, pub, json, cid, witnesses);
    }

    /* ------------------------------------------------------------------ */
    /*  #4 other findings                                                  */
    /* ------------------------------------------------------------------ */

    /// @dev With an unsound willCreation circuit, an attacker holding their own probated CID could
    ///      forge the victim's (testator, executor, estates, salt) and pre-deploy a Will at the
    ///      victim's CREATE2 address, so the victim's later createWill collides and reverts.
    ///      Binding the will's testator to the uploader prevents this.
    function test_PoC4_CreateWill_CannotPreoccupyAnotherTestatorsWillAddress() public {
        Upload memory attackerUpload = _upload(attacker, 2);
        _notarizeAndProbate(attackerUpload.cid);

        uint256[321] memory victimParams = _willCreationPubSignals(victim, attacker, 7, attackerUpload.json);

        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("TestatorMismatch(address,address)")), victim, attacker));
        vm.prank(attacker);
        factory.createWill(pA, pB, pC, victimParams, attackerUpload.json, attackerUpload.cid);
    }

    function _expectUploadRevertsWithInvalidWitnesses(address[2] memory badWitnesses) internal {
        JsonCidVerifier.TypedJsonObject memory json = _encryptedWill(1);
        string memory cid = jsonCidVerifier.generateCidString(json);
        uint256[310] memory pub = _cidUploadPubSignals(victim, json);
        cidUploadVerifier.issue(pub);

        vm.expectRevert(
            abi.encodeWithSelector(
                bytes4(keccak256("InvalidWitnesses(address,address)")), badWitnesses[0], badWitnesses[1]
            )
        );
        vm.prank(victim);
        factory.uploadCid(pA, pB, pC, pub, json, cid, badWitnesses);
    }

    /// @dev One key must not fill both witness slots.
    function test_PoC5_UploadCid_RejectsSameWitnessTwice() public {
        _expectUploadRevertsWithInvalidWitnesses([witnesses[0], witnesses[0]]);
    }

    /// @dev ECDSA.recover never returns address(0), so a zero witness would leave the CID un-notarizable.
    function test_PoC5_UploadCid_RejectsZeroAddressWitness() public {
        _expectUploadRevertsWithInvalidWitnesses([witnesses[0], address(0)]);
        _expectUploadRevertsWithInvalidWitnesses([address(0), witnesses[1]]);
    }

    /// @dev Documents current behaviour (low severity): witness signatures cover only keccak256(cid),
    ///      with no chainId / factory address, so they replay on any other deployment.
    function test_Finding_WitnessSignaturesReplayAcrossDeployments() public {
        Upload memory victimUpload = _upload(victim, 1);
        bytes[2] memory sigs = _witnessSignatures(victimUpload.cid);

        WillFactory otherFactory = new WillFactory(
            address(cidUploadVerifier), address(willCreationVerifier), address(jsonCidVerifier), notary, oracle, permit2, MAX_ESTATES
        );
        vm.prank(victim);
        otherFactory.uploadCid(pA, pB, pC, victimUpload.pubSignals, victimUpload.json, victimUpload.cid, witnesses);

        vm.warp(vm.getBlockTimestamp() + 1);
        vm.prank(notary);
        factory.notarizeCid(victimUpload.cid, sigs);
        vm.prank(notary);
        otherFactory.notarizeCid(victimUpload.cid, sigs);

        assertGt(otherFactory.cidNotarizedTimes(victimUpload.cid), 0);
    }
}
