// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import { IVerifierConstants } from "./interfaces/IVerifierConstants.sol";
import { EllipticCurveOps } from "./libs/EllipticCurveOps.sol";

contract Multiplier2Verifier is EllipticCurveOps, IVerifierConstants {
    // Verification Key data
    uint256 constant r    = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    uint256 constant q   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;
    uint256 constant alphax  = 16428432848801857252194528405604668803277877773566238944394625302971855135431;
    uint256 constant alphay  = 16846502678714586896801519656441059708016666274385668027902869494772365009666;
    uint256 constant betax1  = 3182164110458002340215786955198810119980427837186618912744689678939861918171;
    uint256 constant betax2  = 16348171800823588416173124589066524623406261996681292662100840445103873053252;
    uint256 constant betay1  = 4920802715848186258981584729175884379674325733638798907835771393452862684714;
    uint256 constant betay2  = 19687132236965066906216944365591810874384658708175106803089633851114028275753;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 5299056580874884385419822156956500723346859880835024341244563421754377033853;
    uint256 constant deltax2 = 8993573748147059789409646837808423062381039578366264393857573699972696770156;
    uint256 constant deltay1 = 6915465533247537232949032487517299866557940917013170464123891775432143115380;
    uint256 constant deltay2 = 10354891096865123017216872895230974545734439815175039995500024729259132099092;
    // IC0 constant
    uint256 constant IC0x = 18961697578239744240108344325495018012100580995375048485976428394891047573355;
    uint256 constant IC0y = 20841979920818773302471782183337819744071286232434092175629384391460315626747;

    IVerifierConstants public immutable constants1;

    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;
    uint16 constant pLastMem = 896;

    constructor(address _constants1) {
        constants1 = IVerifierConstants(_constants1);
    }

    function _getICCount() internal pure returns (uint256) {
        return 2;
    }

    function getICCount() external pure returns (uint256) {
        return _getICCount();
    }

    function _getIC(uint256 index) internal view returns (uint256 x, uint256 y) {
        if (index == 0) {
            return (IC0x, IC0y);
        } else if (index < _getICCount()) {
            return constants1.getIC(index);
        } else {
            revert IndexOutOfRange(index);
        }
    }

    function getIC(uint256 index) external view returns (uint256 x, uint256 y) {
        return _getIC(index);
    }

    function _getBatchIC(uint256 startIdx, uint256 count)
        internal
        view
        returns (uint256[] memory xs, uint256[] memory ys)
    {
        if (startIdx == 0 || startIdx >= _getICCount()) revert BatchStartOutOfRange(startIdx);
        if (startIdx + count > _getICCount()) revert BatchEndOutOfRange(startIdx, count);

        xs = new uint256[](count);
        ys = new uint256[](count);

        uint256 processed = 0;

        // Process constants1 range (1+)
        if (processed < count) {
            uint256 batchStart = startIdx;
            uint256 remaining = count - processed;

            (uint256[] memory batchXs, uint256[] memory batchYs) = constants1.getBatchIC(batchStart, remaining);

            for (uint256 i = 0; i < remaining; i++) {
                xs[processed + i] = batchXs[i];
                ys[processed + i] = batchYs[i];
            }
        }
    }

    function getBatchIC(uint256 startIdx, uint256 count)
        external
        view
        returns (uint256[] memory xs, uint256[] memory ys)
    {
        return _getBatchIC(startIdx, count);
    }

    function computeLinearCombination(uint256[1] calldata pubSignals) internal view returns (uint256 x, uint256 y) {
        // Get IC0 as starting point
        (x, y) = _getIC(0);
        if (!isOnCurve(x, y)) revert ICNotOnCurve(x, y);

        // Adjust batch size based on gas limits
        uint256 batchSize = 50;
        uint256 ICCount = _getICCount();

        for (uint256 start = 1; start < ICCount; start += batchSize) {
            uint256 end = start + batchSize > ICCount ? ICCount : start + batchSize;
            uint256 count = end - start;

            // Get batch of IC constants
            (uint256[] memory icxs, uint256[] memory icys) = _getBatchIC(start, count);

            // Process each IC in the batch
            for (uint256 i = 0; i < count; i++) {
                uint256 signalIndex = start + i - 1; // -1 because pubSignals is 0-indexed but IC starts from 1
                if (signalIndex < 1 && pubSignals[signalIndex] != 0) {
                    // Scalar multiplication
                    (uint256 mulX, uint256 mulY) = ecMul(icxs[i], icys[i], pubSignals[signalIndex]);

                    // Point addition
                    (x, y) = ecAdd(x, y, mulX, mulY);
                }
            }
        }
    }

    function verifyProof(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[1] calldata _pubSignals
    ) public view returns (bool) {
        (uint256 vk_x, uint256 vk_y) = computeLinearCombination(_pubSignals);
        assembly {
            function checkField(v) {
                if iszero(lt(v, r)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function checkPairing(pA, pB, pC, pubSignals, pMem, vkX, vkY) -> isOk {
                let _pPairing := add(pMem, pPairing)
                let _pVk := add(pMem, pVk)

                // -A
                mstore(_pPairing, calldataload(pA))
                mstore(add(_pPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

                // B
                mstore(add(_pPairing, 64), calldataload(pB))
                mstore(add(_pPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pPairing, 160), calldataload(add(pB, 96)))

                // alpha1
                mstore(add(_pPairing, 192), alphax)
                mstore(add(_pPairing, 224), alphay)

                // beta2
                mstore(add(_pPairing, 256), betax1)
                mstore(add(_pPairing, 288), betax2)
                mstore(add(_pPairing, 320), betay1)
                mstore(add(_pPairing, 352), betay2)

                // vk_x
                mstore(add(_pPairing, 384), vkX)
                mstore(add(_pPairing, 416), vkY)

                // gamma2
                mstore(add(_pPairing, 448), gammax1)
                mstore(add(_pPairing, 480), gammax2)
                mstore(add(_pPairing, 512), gammay1)
                mstore(add(_pPairing, 544), gammay2)

                // C
                mstore(add(_pPairing, 576), calldataload(pC))
                mstore(add(_pPairing, 608), calldataload(add(pC, 32)))

                // delta2
                mstore(add(_pPairing, 640), deltax1)
                mstore(add(_pPairing, 672), deltax2)
                mstore(add(_pPairing, 704), deltay1)
                mstore(add(_pPairing, 736), deltay2)

                let success := staticcall(sub(gas(), 2000), 8, _pPairing, 768, _pPairing, 0x20)

                isOk := and(success, mload(_pPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            // Validate that all evaluations ∈ F
            for { let i := 0 } lt(i, 1) { i := add(i, 1) } { checkField(calldataload(add(_pubSignals, mul(i, 32)))) }

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem, vk_x, vk_y)

            mstore(0, isValid)
            return(0, 0x20)
        }
    }
}

contract Multiplier2VerifierConstants1 is IVerifierConstants {
    uint256 constant IC1x = 13733180025360092329807767760986348291111983155636582635893099319893466030223;
    uint256 constant IC1y = 6641384280109001791545944924349806680562405564920243612166960022401934995277;

    function _getICRange() internal pure returns (uint256 start, uint256 end) {
        return (1, 2);
    }

    function _getICCount() internal pure returns (uint256) {
        (uint256 start, uint256 end) = _getICRange();
        return end - start;
    }

    function getICCount() external pure returns (uint256) {
        return _getICCount();
    }

    function _getIC(uint256 index) internal pure returns (uint256 x, uint256 y) {
        (uint256 start, uint256 end) = _getICRange();
        if (index < start || index >= end) revert IndexOutOfRange(index);

        if (index == 1) return (IC1x, IC1y);

        revert InvalidIndex(index);
    }

    function getIC(uint256 index) external pure returns (uint256 x, uint256 y) {
        return _getIC(index);
    }

    function getBatchIC(uint256 startIdx, uint256 count)
        external pure returns (uint256[] memory xs, uint256[] memory ys) {
        (uint256 start, uint256 end) = _getICRange();
        if (startIdx < start || startIdx >= end) revert BatchStartOutOfRange(startIdx);
        if (startIdx + count > end) revert BatchEndOutOfRange(startIdx, count);
        
        xs = new uint256[](count);
        ys = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            (xs[i], ys[i]) = _getIC(startIdx + i);
        }
    }
}
