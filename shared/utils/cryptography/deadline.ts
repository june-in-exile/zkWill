import { PERMIT2_CONFIG } from "@shared/config.js";

/**
 * Calculate permit deadline timestamp
 *
 * @param durationMs - Duration in milliseconds (default: 100 years from PERMIT2_CONFIG)
 * @returns Deadline timestamp in seconds (Unix timestamp)
 */
function calculateDeadline(
  durationMs: number = PERMIT2_CONFIG.defaultDuration,
): number {
  console.log("Calculating deadline...");

  const endTimeMs = Date.now() + durationMs;
  const endTimeSeconds = Math.floor(endTimeMs / 1000);

  console.log(
    "Signature valid until:",
    new Date(endTimeSeconds * 1000).toISOString()
  );

  return endTimeSeconds;
}

export { calculateDeadline }