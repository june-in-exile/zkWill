// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { CidUploadVerifier } from "src/CidUploadVerifier.sol";
import { WillCreationVerifier } from "src/WillCreationVerifier.sol";
import { JsonCidVerifier } from "src/JsonCidVerifier.sol";
import { Will } from "src/Will.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract WillFactory {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    CidUploadVerifier public cidUploadVerifier;
    WillCreationVerifier public willCreateVerifier;
    JsonCidVerifier public jsonCidVerifier;
    address immutable public notary;
    address immutable public oracle;
    address public permit2;
    uint8 public maxEstates;

    mapping(string => uint256) private _cidUploadedTimes;
    mapping(string => uint256) private _cidNotarizedTimes;
    mapping(string => uint256) private _cidProbatedTimes;
    mapping(string => address[2]) private _cidWitnesses;
    mapping(string => address) public wills;

    event CidUploaded(string indexed cid, uint256 timestamp);
    event CidNotarized(string indexed cid, uint256 timestamp);
    event CidProbated(string indexed cid, uint256 timestamp);
    event WillCreated(string indexed cid, address indexed testator, address will);

    event UploadedCidRevoked(string indexed cid, uint256 timestamp);
    event NotarizedCidRevoked(string indexed cid, uint256 timestamp);
    event ProbatedCidRevoked(string indexed cid, uint256 timestamp);

    error NotTestator(address caller, address testator);
    error NotNotary(address caller, address notary);
    error NotOracle(address caller, address oracle);
    error NotExecutor(address caller, address executor);

    error AlreadyUploaded(string cid);
    error AlreadyNotarized(string cid);
    error AlreadyProbated(string cid);

    error CidNotUploaded(string cid);
    error CidNotNotarized(string cid);
    error CidNotProbated(string cid);

    error InvalidWitnessCount();
    error WitnessSignatureInvalid(string cid, address witness, bytes signature);

    error WrongCiphertext();
    error WrongInitializationVector();

    error JsonCidInvalid(string cid);
    error CidUploadProofInvalid();
    error SignatureInvalid(string _cid, bytes _signature, address signer);
    error WillCreationProofInvalid();

    error WillAlreadyExists(string cid, address existingWill);
    error WillAddressInconsistent(address predicted, address actual);

    constructor(
        address _cidUploadVerifier,
        address _willCreateVerifier,
        address _jsonCidVerifier,
        address _notary,
        address _oracle,
        address _permit2,
        uint8 _maxEstates
    ) {
        cidUploadVerifier = CidUploadVerifier(_cidUploadVerifier);
        willCreateVerifier = WillCreationVerifier(_willCreateVerifier);
        jsonCidVerifier = JsonCidVerifier(_jsonCidVerifier);
        notary = _notary;
        oracle = _oracle;
        permit2 = _permit2;
        maxEstates = _maxEstates;
    }

    modifier onlyNotary() {
        if (msg.sender != notary) revert NotNotary(msg.sender, notary);
        _;
    }

    modifier onlyOracle() {
        if (msg.sender != oracle) revert NotOracle(msg.sender, oracle);
        _;
    }

    function cidUploadedTimes(string calldata _cid) external view returns (uint256) {
        return _cidUploadedTimes[_cid];
    }

    function cidNotarizedTimes(string calldata _cid) external view returns (uint256) {
        return _cidNotarizedTimes[_cid];
    }

    function cidProbatedTimes(string calldata _cid) external view returns (uint256) {
        return _cidProbatedTimes[_cid];
    }

    function _predictWill(address _testator, address _executor, Will.Estate[] memory estates, uint256 _salt)
        internal
        view
        returns (address)
    {
        bytes memory bytecode =
            abi.encodePacked(type(Will).creationCode, abi.encode(permit2, _testator, _executor, estates));

        bytes32 hash = keccak256(abi.encodePacked(bytes1(0xff), address(this), _salt, keccak256(bytecode)));

        return address(uint160(uint256(hash)));
    }

    function predictWill(address _testator, address _executor, Will.Estate[] calldata estates, uint256 _salt)
        external
        view
        returns (address)
    {
        return _predictWill(_testator, _executor, estates, _salt);
    }

    function _verifyWitnessSignatures(
        string calldata _cid,
        bytes[2] calldata _signatures
    ) internal view {
        address[2] memory witnesses = _cidWitnesses[_cid];

        bytes32 messageHash = keccak256(abi.encodePacked(_cid));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();

        for (uint8 i = 0; i < 2; i++) {
            address recoveredSigner = ethSignedMessageHash.recover(_signatures[i]);
            if (recoveredSigner != witnesses[i]) {
                revert WitnessSignatureInvalid(_cid, witnesses[i], _signatures[i]);
            }
        }
    }

    function uploadCid(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[310] calldata _pubSignals,
        JsonCidVerifier.TypedJsonObject memory _will,
        string calldata _cid,
        address[2] calldata _witnesses
    ) external {
        if (_cidUploadedTimes[_cid] > 0) revert AlreadyUploaded(_cid);

        if (!jsonCidVerifier.verifyCid(_will, _cid)) revert JsonCidInvalid(_cid);

        uint16 pubSignalsIdx = 0;
        address testator = address(uint160(_pubSignals[pubSignalsIdx++]));
        if (msg.sender != testator) revert NotTestator(msg.sender, testator);

        uint256[16] memory iv;
        for (uint256 i = 0; i < 16; i++) {
            iv[i] = _pubSignals[pubSignalsIdx++];
        }
        uint256[293] memory ciphertext;
        for (uint256 i = 0; i < 293; i++) {
            ciphertext[i] = _pubSignals[pubSignalsIdx++];
        }

        if (keccak256(abi.encodePacked(iv)) != keccak256(abi.encodePacked(_will.values[1].numberArray))) revert WrongInitializationVector();
        if (keccak256(abi.encodePacked(ciphertext)) != keccak256(abi.encodePacked(_will.values[3].numberArray))) revert WrongCiphertext();

        if (!cidUploadVerifier.verifyProof(_pA, _pB, _pC, _pubSignals)) revert CidUploadProofInvalid();

        _cidWitnesses[_cid] = _witnesses;
        _cidUploadedTimes[_cid] = block.timestamp;
        emit CidUploaded(_cid, block.timestamp);
    }

    function revokeUploadedCid(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[310] calldata _pubSignals,
        string calldata _cid
    ) external {
        address testator = address(uint160(_pubSignals[0]));
        if (msg.sender != testator) revert NotTestator(msg.sender, testator);

        if (_cidUploadedTimes[_cid] == 0) revert CidNotUploaded(_cid);
        /* Notarized CID should be revoked by notary */
        if (_cidNotarizedTimes[_cid] > _cidUploadedTimes[_cid]) revert AlreadyNotarized(_cid);

        if (!cidUploadVerifier.verifyProof(_pA, _pB, _pC, _pubSignals)) revert CidUploadProofInvalid();

        _cidUploadedTimes[_cid] = 0;
        emit UploadedCidRevoked(_cid, block.timestamp);
    }

    function notarizeCid(string calldata _cid, bytes[2] calldata _witnessSignatures) external onlyNotary {
        /* Upload and notarization of CID cannot be in the same block */
        if (_cidUploadedTimes[_cid] == 0 || _cidUploadedTimes[_cid] >= block.timestamp) revert CidNotUploaded(_cid);

        if (_cidNotarizedTimes[_cid] > _cidUploadedTimes[_cid]) revert AlreadyNotarized(_cid);

        _verifyWitnessSignatures(_cid, _witnessSignatures);

        _cidNotarizedTimes[_cid] = block.timestamp;
        emit CidNotarized(_cid, block.timestamp);
    }

    function revokeNortarizedCid(string calldata _cid) external onlyNotary {
        if (_cidNotarizedTimes[_cid] <= _cidUploadedTimes[_cid]) revert CidNotNotarized(_cid);
        /* Probated CID should be revoked by oracle */
        if (_cidProbatedTimes[_cid] > _cidNotarizedTimes[_cid]) revert AlreadyProbated(_cid);

        _cidNotarizedTimes[_cid] = 0;
        emit NotarizedCidRevoked(_cid, block.timestamp);
    }

    function probateCid(string calldata _cid) external onlyOracle {
        /* Notarization and probation of CID cannot be in the same block */
        if (_cidNotarizedTimes[_cid] == 0 || _cidNotarizedTimes[_cid] >= block.timestamp) revert CidNotNotarized(_cid);

        if (_cidProbatedTimes[_cid] > _cidNotarizedTimes[_cid]) revert AlreadyProbated(_cid);

        _cidProbatedTimes[_cid] = block.timestamp;
        emit CidProbated(_cid, block.timestamp);
    }

    function revokeProbatedCid(string calldata _cid) external onlyOracle {
        if (_cidProbatedTimes[_cid] <= _cidNotarizedTimes[_cid]) revert CidNotProbated(_cid);

        if (wills[_cid] != address(0)) revert WillAlreadyExists(_cid, wills[_cid]);

        _cidProbatedTimes[_cid] = 0;
        emit ProbatedCidRevoked(_cid, block.timestamp);
    }

    function createWill(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[321] calldata _pubSignals,
        JsonCidVerifier.TypedJsonObject memory _will,
        string calldata _cid
    ) external returns (address) {
        if (_cidUploadedTimes[_cid] == 0) revert CidNotUploaded(_cid);
        if (_cidNotarizedTimes[_cid] <= _cidUploadedTimes[_cid]) revert CidNotNotarized(_cid);
        if (_cidProbatedTimes[_cid] <= _cidNotarizedTimes[_cid]) revert CidNotProbated(_cid);

        if (!jsonCidVerifier.verifyCid(_will, _cid)) revert JsonCidInvalid(_cid);

        if (!willCreateVerifier.verifyProof(_pA, _pB, _pC, _pubSignals)) revert WillCreationProofInvalid();
        if (wills[_cid] != address(0)) revert WillAlreadyExists(_cid, wills[_cid]);

        uint16 pubSignalsIdx = 0;
        address testator = address(uint160(_pubSignals[pubSignalsIdx++]));
        address executor = address(uint160(_pubSignals[pubSignalsIdx++]));
        if (msg.sender != executor) revert NotExecutor(msg.sender, executor);

        Will.Estate[] memory estates = new Will.Estate[](maxEstates);
        for (uint8 i = 0; i < maxEstates; i++) {
            estates[i].beneficiary = address(uint160(_pubSignals[pubSignalsIdx++]));
            estates[i].token = address(uint160(_pubSignals[pubSignalsIdx++]));
            estates[i].amount = _pubSignals[pubSignalsIdx++];
        }
        uint256 salt = _pubSignals[pubSignalsIdx++] | (_pubSignals[pubSignalsIdx++] << 64) | (_pubSignals[pubSignalsIdx++] << 128)
            | (_pubSignals[pubSignalsIdx++] << 192);

        uint256[16] memory iv;
        for (uint256 i = 0; i < 16; i++) {
            iv[i] = _pubSignals[pubSignalsIdx++];
        }
        uint256[293] memory ciphertext;
        for (uint256 i = 0; i < 293; i++) {
            ciphertext[i] = _pubSignals[pubSignalsIdx++];
        }

        if (keccak256(abi.encodePacked(iv)) != keccak256(abi.encodePacked(_will.values[1].numberArray))) revert WrongInitializationVector();
        if (keccak256(abi.encodePacked(ciphertext)) != keccak256(abi.encodePacked(_will.values[3].numberArray))) revert WrongCiphertext();

        Will will = new Will{ salt: bytes32(salt) }(permit2, testator, executor, estates);
        address predictedAddress = _predictWill(testator, executor, estates, salt);
        if (address(will) != predictedAddress) revert WillAddressInconsistent(predictedAddress, address(will));

        wills[_cid] = address(will);
        emit WillCreated(_cid, testator, address(will));

        return address(will);
    }
}
