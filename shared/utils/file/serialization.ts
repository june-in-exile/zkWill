/**
 * Will serialization utilities
 * Converts SignedWill to hex string format
 */

import type { SignedWill, SerializedWill } from "@shared/types/index.js";
import { FIELD_HEX_LENGTH } from "@shared/constants/index.js";

/**
 * Serializes will data into a hex string format
 * @param signedWill - The signed will data object
 * @returns Serialized will with hex string
 */
function serializeWill(signedWill: SignedWill): SerializedWill {
  let hex = "";

  // Add testator address (remove 0x prefix)
  hex += signedWill.testator.slice(2);

  // Add executor address (remove 0x prefix)
  hex += signedWill.executor.slice(2);

  // Add each estate
  for (let i = 0; i < signedWill.estates.length; i++) {
    const estate = signedWill.estates[i];

    // Add beneficiary address (remove 0x prefix)
    hex += estate.beneficiary.slice(2);
    // Add token address (remove 0x prefix)
    hex += estate.token.slice(2);
    // Add amount as hex string
    hex += estate.amount.toString(16).padStart(FIELD_HEX_LENGTH.AMOUNT, "0");
  }

  // Add salt as hex string
  hex += signedWill.salt.toString(16).padStart(FIELD_HEX_LENGTH.SALT, "0");

  // Add will address (remove 0x prefix)
  hex += signedWill.will.slice(2);

  // Add permit2 data
  hex += signedWill.permit2.nonce
    .toString(16)
    .padStart(FIELD_HEX_LENGTH.NONCE, "0");
  hex += signedWill.permit2.deadline.toString(16).padStart(16, "0");
  // Add signature (remove 0x prefix)
  hex += signedWill.permit2.signature
    .slice(2)
    .padStart(FIELD_HEX_LENGTH.SIGNATURE, "0");

  return {
    hex,
  };
}

export { serializeWill }