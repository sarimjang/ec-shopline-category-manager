/**
 * MessageSigner - Cryptographic message signing and verification
 * Uses HMAC-SHA256 for message signatures via SubtleCrypto API
 */

class MessageSigner {
  /**
   * Configuration for message signing
   * @type {Object}
   */
  static CONFIG = {
    // Algorithm for signing
    ALGORITHM: {
      name: 'HMAC',
      hash: { name: 'SHA-256' }
    },
    // Key derivation algorithm
    DERIVATION: {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations: 100000,
      length: 256
    },
    // Encoding for signatures (hex or base64)
    SIGNATURE_ENCODING: 'hex'
  };

  /**
   * Initialize MessageSigner with optional default key
   * @param {CryptoKey|undefined} key - Optional default signing key
   */
  constructor(key = undefined) {
    /**
     * The signing key for this instance
     * @type {CryptoKey|undefined}
     */
    this.key = key;

    /**
     * SubtleCrypto instance
     * @type {SubtleCrypto|undefined}
     */
    this.crypto = typeof crypto !== 'undefined' ? crypto.subtle : undefined;
  }

  /**
   * Check if crypto API is available
   * @returns {boolean}
   * @private
   */
  _isCryptoAvailable() {
    return this.crypto !== undefined;
  }

  /**
   * Generate a new signing key from secret
   * Uses PBKDF2 key derivation for secure key generation
   * @param {string} secret - Secret string to derive key from
   * @param {string} salt - Optional salt for key derivation
   * @returns {Promise<CryptoKey>} The derived signing key
   */
  async generateSigningKey(secret, salt = undefined) {
    if (!this._isCryptoAvailable()) {
      throw new Error('Crypto API is not available');
    }

    if (!secret || typeof secret !== 'string') {
      throw new Error('Secret must be a non-empty string');
    }

    // Use provided salt or generate default
    const saltBytes = salt
      ? new TextEncoder().encode(salt)
      : new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);

    // Import secret as password key
    const passwordKey = await this.crypto.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive key using PBKDF2
    const derivedKey = await this.crypto.deriveKey(
      {
        name: MessageSigner.CONFIG.DERIVATION.name,
        salt: saltBytes,
        iterations: MessageSigner.CONFIG.DERIVATION.iterations,
        hash: MessageSigner.CONFIG.DERIVATION.hash
      },
      passwordKey,
      MessageSigner.CONFIG.ALGORITHM,
      false,
      ['sign', 'verify']
    );

    return derivedKey;
  }

  /**
   * Set the signing key for this signer instance
   * @param {CryptoKey} key - The signing key to use
   * @returns {boolean} True if key was set successfully
   */
  setSigningKey(key) {
    if (!key || typeof key !== 'object') {
      return false;
    }

    this.key = key;
    return true;
  }

  /**
   * Sign a message and return signature
   * @param {Object} message - Message object to sign
   * @param {CryptoKey|undefined} key - Optional key, uses instance key if not provided
   * @returns {Promise<string>} Hex-encoded signature
   */
  async signMessage(message, key = undefined) {
    if (!this._isCryptoAvailable()) {
      throw new Error('Crypto API is not available');
    }

    if (!message || typeof message !== 'object') {
      throw new Error('Message must be a non-null object');
    }

    // Resolve signing key
    const signingKey = key || this.key;
    if (!signingKey) {
      throw new Error('No signing key available');
    }

    // Serialize message to JSON
    const messageData = new TextEncoder().encode(JSON.stringify(message));

    // Use HMAC-SHA256 to sign
    const signatureBytes = await this.crypto.sign(
      MessageSigner.CONFIG.ALGORITHM,
      signingKey,
      messageData
    );

    // Encode signature to hex
    const signature = this._bytesToHex(new Uint8Array(signatureBytes));

    return signature;
  }

  /**
   * Verify a message signature
   * @param {Object} message - Original message
   * @param {string} signature - Signature to verify (hex-encoded)
   * @param {CryptoKey|undefined} key - Optional key, uses instance key if not provided
   * @returns {Promise<boolean>} True if signature is valid
   */
  async verifySignature(message, signature, key = undefined) {
    if (!this._isCryptoAvailable()) {
      throw new Error('Crypto API is not available');
    }

    if (!message || typeof message !== 'object') {
      throw new Error('Message must be a non-null object');
    }

    if (!signature || typeof signature !== 'string') {
      throw new Error('Signature must be a non-empty string');
    }

    // Resolve signing key
    const verificationKey = key || this.key;
    if (!verificationKey) {
      throw new Error('No verification key available');
    }

    try {
      // Serialize message to JSON
      const messageData = new TextEncoder().encode(JSON.stringify(message));

      // Decode signature from hex
      const signatureBytes = this._hexToBytes(signature);

      // Use HMAC-SHA256 to verify
      const isValid = await this.crypto.verify(
        MessageSigner.CONFIG.ALGORITHM,
        verificationKey,
        signatureBytes,
        messageData
      );

      return isValid;
    } catch (err) {
      // Return false on verification error
      return false;
    }
  }

  /**
   * Get algorithm information
   * @returns {Object} Algorithm details
   */
  getAlgorithm() {
    return {
      name: MessageSigner.CONFIG.ALGORITHM.name,
      hash: MessageSigner.CONFIG.ALGORITHM.hash.name,
      derivation: MessageSigner.CONFIG.DERIVATION.name,
      signatureEncoding: MessageSigner.CONFIG.SIGNATURE_ENCODING,
      keyDerivationIterations: MessageSigner.CONFIG.DERIVATION.iterations
    };
  }

  /**
   * Check if signer has a key set
   * @returns {boolean}
   */
  hasKey() {
    return this.key !== undefined;
  }

  /**
   * Convert bytes to hex string
   * @param {Uint8Array} bytes - Bytes to convert
   * @returns {string} Hex string
   * @private
   */
  _bytesToHex(bytes) {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Convert hex string to bytes
   * @param {string} hex - Hex string to convert
   * @returns {Uint8Array} Bytes
   * @private
   */
  _hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
  }
}

// Create singleton instance
const messageSigner = new MessageSigner();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MessageSigner, messageSigner };
}

// Make available globally for extension context
if (typeof window !== 'undefined') {
  window.ShoplineMessageSigner = { MessageSigner, messageSigner };
}
