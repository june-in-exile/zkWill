import React, { useState } from 'react';
import { encryptWill } from '@utils/cryptography/crypto';
import type { WillData, EncryptedData } from '../TestatorPage';

interface Props {
  willData: WillData;
  onEncrypted: (data: EncryptedData) => void;
}

const EncryptStep: React.FC<Props> = ({ willData, onEncrypted }) => {
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEncrypt = async () => {
    setIsEncrypting(true);
    setError(null);

    try {
      // Serialize will data (simplified version)
      const serialized = JSON.stringify(willData);
      const hexData = Array.from(new TextEncoder().encode(serialized))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      // Encrypt
      const { encrypted, key } = await encryptWill(hexData);

      // Download key for user
      const keyHex = Array.from(key)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      const keyBlob = new Blob([keyHex], { type: 'text/plain' });
      const url = URL.createObjectURL(keyBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'will-encryption-key.txt';
      a.click();
      URL.revokeObjectURL(url);

      onEncrypted({ encrypted, key });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Encryption failed');
    } finally {
      setIsEncrypting(false);
    }
  };

  return (
    <div className="encrypt-step">
      <h2>Encrypt Will</h2>
      <div className="will-preview">
        <h3>Will Data Preview:</h3>
        <pre>{JSON.stringify(willData, null, 2)}</pre>
      </div>

      <div className="warning-box">
        <strong>⚠️ Important:</strong> The encryption key will be downloaded to your computer.
        Keep it safe! The executor will need this key to decrypt the will.
      </div>

      {error && <div className="error">{error}</div>}

      <button onClick={handleEncrypt} disabled={isEncrypting} className="btn-primary">
        {isEncrypting ? 'Encrypting...' : 'Encrypt Will'}
      </button>
    </div>
  );
};

export default EncryptStep;
