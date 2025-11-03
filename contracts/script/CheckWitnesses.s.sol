// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {WillFactory} from "src/WillFactory.sol";

contract CheckWitnesses is Script {
    function run() external view {
        address willFactory = vm.envAddress("WILL_FACTORY");
        string memory cid = "bagaaieralww5dzozks55uibntn2wmbqlxwxorpwyvxdhayta5lybrrwrgzxq";
        
        WillFactory factory = WillFactory(willFactory);
        address[2] memory witnesses = factory.getCidWitnesses(cid);
        
        console.log("CID:", cid);
        console.log("Witness[0]:", witnesses[0]);
        console.log("Witness[1]:", witnesses[1]);
    }
}
