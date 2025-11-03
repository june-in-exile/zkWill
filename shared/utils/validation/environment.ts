import type {
  EnvironmentValidationOptions,
  ValidationResult,
} from "@shared/types/validation.js";
import {
  validateEthereumAddress,
  validatePrivateKey,
  validateSignature,
  validateCidv1,
} from "@shared/utils/validation/index.js";

/**
 * Generic environment variable validation function
 * @param options Validation options including required fields, validators, and transforms
 * @returns Validation result with validated data or errors
 */
function validateEnvironment<T extends Record<string, any>>(
  options: EnvironmentValidationOptions,
): ValidationResult<T> {
  const errors: string[] = [];
  const data: Record<string, any> = {};

  if (options.required) {
    for (const field of options.required) {
      const value = process.env[field];
      if (!value) {
        errors.push(`Environment variable ${field} is not set`);
        continue;
      }
      data[field] = value;
    }
  }

  if (options.optional) {
    for (const field of options.optional) {
      const value = process.env[field];
      if (value) {
        data[field] = value;
      }
    }
  }

  if (options.validators) {
    for (const [field, validator] of Object.entries(options.validators)) {
      const value = data[field];
      if (value && !validator(value)) {
        errors.push(`Invalid format for environment variable ${field}`);
      }
    }
  }

  if (options.transforms) {
    for (const [field, transform] of Object.entries(options.transforms)) {
      const value = data[field];
      if (value) {
        try {
          data[field] = transform(value);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          errors.push(`Failed to transform ${field}: ${errorMessage}`);
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    data: data as T,
    errors,
  };
}

const validators = {
  ethereumAddress: (value: string): boolean => validateEthereumAddress(value),
  privateKey: (value: string): boolean => validatePrivateKey(value),
  cidv1: (value: string): boolean => validateCidv1(value),
  signature: (value: string): boolean => validateSignature(value),
};

// Preset validation configurations for common use cases
const presetValidations = {
  tokenApproval: (): EnvironmentValidationOptions => ({
    required: ["TESTATOR_PRIVATE_KEY", "PERMIT2"],
    validators: {
      TESTATOR_PRIVATE_KEY: validators.privateKey,
      PERMIT2: validators.ethereumAddress,
    },
  }),

  predictWill: (): EnvironmentValidationOptions => ({
    required: ["WILL_FACTORY"],
    validators: {
      WILL_FACTORY: validators.ethereumAddress,
    },
  }),

  permitSigning: (): EnvironmentValidationOptions => ({
    required: ["TESTATOR_PRIVATE_KEY"],
    validators: {
      TESTATOR_PRIVATE_KEY: validators.privateKey,
    },
  }),

  uploadCid: (): EnvironmentValidationOptions => ({
    required: ["WILL_FACTORY", "TESTATOR_PRIVATE_KEY", "CID", "WITNESS1", "WITNESS2"],
    validators: {
      WILL_FACTORY: validators.ethereumAddress,
      TESTATOR_PRIVATE_KEY: validators.privateKey,
      CID: validators.cidv1,
      WITNESS1: validators.ethereumAddress,
      WITNESS2: validators.ethereumAddress,
    },
  }),

  submitProof: (): EnvironmentValidationOptions => ({
    optional: [
      "MULTIPLIER2_VERIFIER",
      "CID_UPLOAD_VERIFIER",
      "WILL_CREATION_VERIFIER",
    ],
    validators: {
      MULTIPLIER2_VERIFIER: validators.ethereumAddress,
      CID_UPLOAD_VERIFIER: validators.ethereumAddress,
      WILL_CREATION_VERIFIER: validators.ethereumAddress,
    },
  }),

  ipfsDownload: (): EnvironmentValidationOptions => ({
    required: ["CID"],
    validators: {
      CID: validators.cidv1,
    },
  }),

  witnessSigning: (): EnvironmentValidationOptions => ({
    required: ["WITNESS1_PRIVATE_KEY", "WITNESS2_PRIVATE_KEY", "CID"],
    validators: {
      WITNESS1_PRIVATE_KEY: validators.privateKey,
      WITNESS2_PRIVATE_KEY: validators.privateKey,
      CID: validators.cidv1,
    },
  }),

  notarizeCid: (): EnvironmentValidationOptions => ({
    required: [
      "WILL_FACTORY",
      "NOTARY_PRIVATE_KEY",
      "CID",
      "WITNESS1_SIGNATURE",
      "WITNESS2_SIGNATURE",
    ],
    validators: {
      WILL_FACTORY: validators.ethereumAddress,
      NOTARY_PRIVATE_KEY: validators.privateKey,
      CID: validators.cidv1,
      WITNESS1_SIGNATURE: validators.signature,
      WITNESS2_SIGNATURE: validators.signature,
    },
  }),

  createWill: (): EnvironmentValidationOptions => ({
    required: ["WILL_FACTORY", "EXECUTOR_PRIVATE_KEY", "CID"],
    validators: {
      WILL_FACTORY: validators.ethereumAddress,
      EXECUTOR_PRIVATE_KEY: validators.privateKey,
      CID: validators.cidv1,
    },
  }),

  probateCid: (): EnvironmentValidationOptions => ({
    required: ["ORACLE_PRIVATE_KEY", "WILL_FACTORY", "CID"],
    validators: {
      ORACLE_PRIVATE_KEY: validators.privateKey,
      WILL_FACTORY: validators.ethereumAddress,
      CID: validators.cidv1,
    },
  }),

  signatureTransfer: (): EnvironmentValidationOptions => ({
    required: ["EXECUTOR_PRIVATE_KEY"],
    validators: {
      EXECUTOR_PRIVATE_KEY: validators.privateKey,
    },
  }),
};

export { validateEnvironment, presetValidations };
