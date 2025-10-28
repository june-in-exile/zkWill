pragma circom 2.2.2;

include "../shared/components/aesGcm/ctrEncrypt.circom";

/**
 * AES CTR Mode Decryption Circuit
 * Based on CtrEncrypt
 * 
 * @param keyBits - AES key size in bits (128, 192, or 256)
 * @param ciphertextBytes - Number of bytes to decrypt
 */
template CtrDecrypt(keyBits, ciphertextBytes) {
    var Nk;
    assert(keyBits == 128 || keyBits == 192 || keyBits == 256);
    if (keyBits == 128) {
        Nk = 4;
    } else if (keyBits == 192) {
        Nk = 6;
    } else {
        Nk = 8;
    }
    
    signal input {byte} ciphertext[ciphertextBytes]; // Ciphertext data in bytes
    input Word() key[Nk]; // AES key using Word bus structure
    signal input {byte} iv[16]; // Initial counter value
    signal output {byte} plaintext[ciphertextBytes]; // Decrypted output

    plaintext <== CtrEncrypt(keyBits, ciphertextBytes)(ciphertext, key, iv);
}

// Auto updated: 2025-10-28T16:42:31.295Z
bus UntaggedWord() {
    signal bytes[4];
}

template UntaggedCtrDecrypt(keyBits, ciphertextBytes) {
    var Nk;
    assert(keyBits == 128 || keyBits == 192 || keyBits == 256);
    if (keyBits == 128) {
        Nk = 4;
    } else if (keyBits == 192) {
        Nk = 6;
    } else {
        Nk = 8;
    }

    signal input ciphertext[ciphertextBytes];
    input UntaggedWord() key[Nk];
    signal input iv[16];
    signal output {byte} plaintext[ciphertextBytes];

    signal {byte} _ciphertext[ciphertextBytes];
    _ciphertext <== ciphertext;
    signal {byte} _iv[16];
    _iv <== iv;

    Word() _key[Nk];

    for (var i = 0; i < Nk; i++) {
        _key[i].bytes <== key[i].bytes;
    }


    component ctrdecryptComponent = CtrDecrypt(keyBits, ciphertextBytes);
    ctrdecryptComponent.ciphertext <== _ciphertext;
    ctrdecryptComponent.key <== _key;
    ctrdecryptComponent.iv <== _iv;
    plaintext <== ctrdecryptComponent.plaintext;
}

component main = UntaggedCtrDecrypt(256, 293);
