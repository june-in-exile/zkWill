/**
 * Validation configuration constants
 * Browser-compatible (no Node.js dependencies)
 */

// ================================
// SIGNATURE CONFIG
// ================================
export const SIGNATURE_CONFIG = {
  // Signature formats
  signatureLength: 130, // 65 bytes
} as const;

// ================================
// HASH CONFIG
// ================================
export const HASH_CONFIG = {
  // Input validation
  maxInputSize: 10 * 1024 * 1024, // 10MB max input size
  supportedEncodings: ['utf8', 'ascii', 'base64', 'hex'] as const,
} as const;
