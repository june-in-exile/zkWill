/**
 * Transform encrypted will data to TypedJsonObject format for smart contract
 */

interface EncryptedWill {
  algorithm: string;
  iv: number[];
  authTag: number[];
  ciphertext: number[];
  timestamp: number;
}

interface TypedJsonObject {
  keys: string[];
  values: Array<{
    value: string;
    numberArray: string[];
    valueType: number;
  }>;
}

/**
 * Convert encrypted will data to TypedJsonObject format
 *
 * This format is required by the JsonCidVerifier contract
 *
 * valueType mapping:
 * - 0: STRING
 * - 1: NUMBER
 * - 2: NUMBER_ARRAY
 */
export const encryptedWillToTypedJsonObject = (
  encryptedWillData: EncryptedWill
): TypedJsonObject => {
  try {
    const keys: string[] = [];
    const values: Array<{
      value: string;
      numberArray: string[];
      valueType: number;
    }> = [];

    // algorithm (STRING)
    keys.push('algorithm');
    values.push({
      value: encryptedWillData.algorithm,
      numberArray: [],
      valueType: 0, // JsonValueType.STRING
    });

    // iv (NUMBER_ARRAY)
    keys.push('iv');
    const ivArray = encryptedWillData.iv.map(n => n.toString());
    console.log('IV array length:', ivArray.length, 'Sample:', ivArray.slice(0, 3));
    values.push({
      value: '',
      numberArray: ivArray,
      valueType: 2, // JsonValueType.NUMBER_ARRAY
    });

    // authTag (NUMBER_ARRAY)
    keys.push('authTag');
    const authTagArray = encryptedWillData.authTag.map(n => n.toString());
    console.log('AuthTag array length:', authTagArray.length, 'Sample:', authTagArray.slice(0, 3));
    values.push({
      value: '',
      numberArray: authTagArray,
      valueType: 2, // JsonValueType.NUMBER_ARRAY
    });

    // ciphertext (NUMBER_ARRAY)
    keys.push('ciphertext');
    const ciphertextArray = encryptedWillData.ciphertext.map(n => n.toString());
    console.log('Ciphertext array length:', ciphertextArray.length, 'Sample:', ciphertextArray.slice(0, 3));
    values.push({
      value: '',
      numberArray: ciphertextArray,
      valueType: 2, // JsonValueType.NUMBER_ARRAY
    });

    // timestamp (NUMBER)
    keys.push('timestamp');
    values.push({
      value: encryptedWillData.timestamp.toString(),
      numberArray: [],
      valueType: 1, // JsonValueType.NUMBER
    });

    return { keys, values };
  } catch (error) {
    throw new Error(
      `Failed to convert encrypted will data: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};
