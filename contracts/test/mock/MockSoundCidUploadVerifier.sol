// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @dev Models a SOUND CidUpload verifier: a proof only verifies for public signals that were
 *      legitimately issued to their prover (i.e. the prover really knows the key and the testator's
 *      permit signature for that ciphertext). Nobody can obtain a proof for someone else's statement.
 */
contract MockSoundCidUploadVerifier {
    mapping(bytes32 => bool) private _issued;

    function issue(uint256[310] calldata pubSignals) external {
        _issued[keccak256(abi.encode(pubSignals))] = true;
    }

    function verifyProof(uint256[2] calldata, uint256[2][2] calldata, uint256[2] calldata, uint256[310] calldata pubSignals)
        external
        view
        returns (bool)
    {
        return _issued[keccak256(abi.encode(pubSignals))];
    }
}
