export interface EncryptionResult {
  ciphertext: number[];
  iv: number[];
  authTag?: number[];
}

export interface EncryptedWill {
  algorithm: string;
  iv: number[];
  authTag: number[];
  ciphertext: number[];
  timestamp: number;
}

/**
 * Generate a random encryption key (AES-256)
 */
export const generateKey = async (): Promise<CryptoKey> => {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-CTR',
      length: 256,
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
};

/**
 * Generate a random initialization vector
 */
export const generateIV = (): Uint8Array => {
  return crypto.getRandomValues(new Uint8Array(16));
};

/**
 * Export CryptoKey to raw bytes
 */
export const exportKey = async (key: CryptoKey): Promise<Uint8Array> => {
  const exported = await crypto.subtle.exportKey('raw', key);
  return new Uint8Array(exported);
};

/**
 * Import raw bytes to CryptoKey
 */
export const importKey = async (keyData: Uint8Array): Promise<CryptoKey> => {
  return await crypto.subtle.importKey(
    'raw',
    keyData as BufferSource,
    {
      name: 'AES-CTR',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
};

/**
 * Encrypt data using AES-256-CTR
 */
export const encrypt = async (
  plaintext: Uint8Array,
  key: CryptoKey,
  iv: Uint8Array
): Promise<EncryptionResult> => {
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-CTR',
      counter: iv as BufferSource,
      length: 128,
    },
    key,
    plaintext as BufferSource
  );

  return {
    ciphertext: Array.from(new Uint8Array(ciphertext)),
    iv: Array.from(iv),
  };
};

/**
 * Decrypt data using AES-256-CTR
 */
export const decrypt = async (
  ciphertext: Uint8Array,
  key: CryptoKey,
  iv: Uint8Array
): Promise<Uint8Array> => {
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-CTR',
      counter: iv as BufferSource,
      length: 128,
    },
    key,
    ciphertext as BufferSource
  );

  return new Uint8Array(decrypted);
};

/**
 * Convert hex string to Uint8Array
 */
export const hexToBytes = (hex: string): Uint8Array => {
  const cleanHex = hex.replace(/^0x/, '');
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.slice(i, i + 2), 16);
  }
  return bytes;
};

/**
 * Convert Uint8Array to hex string
 */
export const bytesToHex = (bytes: Uint8Array): string => {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * Encrypt will data
 */
export const encryptWill = async (
  serializedHex: string
): Promise<{ encrypted: EncryptedWill; key: Uint8Array }> => {
  const key = await generateKey();
  const iv = generateIV();
  const plaintext = hexToBytes(serializedHex);

  const result = await encrypt(plaintext, key, iv);
  const exportedKey = await exportKey(key);

  const encrypted: EncryptedWill = {
    algorithm: 'aes-256-ctr',
    iv: result.iv,
    authTag: [], // Not used in CTR mode
    ciphertext: result.ciphertext,
    timestamp: Math.floor(Date.now() / 1000),
  };

  return { encrypted, key: exportedKey };
};

/**
 * Decrypt will data
 */
export const decryptWill = async (
  encrypted: EncryptedWill,
  keyData: Uint8Array
): Promise<string> => {
  const key = await importKey(keyData);
  const ciphertext = new Uint8Array(encrypted.ciphertext);
  const iv = new Uint8Array(encrypted.iv);

  const decrypted = await decrypt(ciphertext, key, iv);
  return bytesToHex(decrypted);
};
