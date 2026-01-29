/**
 * NonceManager - Cryptographic nonce generation and validation
 * Generates secure nonces for cross-world communication authentication
 */

class NonceManager {
  /**
   * Configuration for nonce management
   * @type {Object}
   */
  static CONFIG = {
    // Nonce length in bytes (32 hex chars = 16 bytes)
    NONCE_LENGTH_BYTES: 16,
    // Time-to-live for nonces (5 minutes)
    TTL_MS: 5 * 60 * 1000,
    // Cleanup interval (run every 1 minute)
    CLEANUP_INTERVAL_MS: 60 * 1000,
  };

  /**
   * Initialize NonceManager with in-memory nonce storage
   */
  constructor() {
    /**
     * Map of nonce -> { value, timestamp, expiresAt }
     * @type {Map<string, {value: string, timestamp: number, expiresAt: number}>}
     */
    this.nonces = new Map();

    // Start automatic cleanup
    this.startCleanup();
  }

  /**
   * Generate a cryptographically secure nonce
   * @returns {string} 32-character hex string (e.g., "a1b2c3d4...")
   * @throws {Error} If crypto API is unavailable
   */
  generate() {
    // Generate 16 random bytes using crypto API
    const buffer = new Uint8Array(NonceManager.CONFIG.NONCE_LENGTH_BYTES);
    crypto.getRandomValues(buffer);

    // Convert bytes to hex string (32 characters)
    const nonce = Array.from(buffer)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');

    // Store nonce with metadata
    const now = Date.now();
    this.nonces.set(nonce, {
      value: nonce,
      timestamp: now,
      expiresAt: now + NonceManager.CONFIG.TTL_MS,
    });

    return nonce;
  }

  /**
   * Validate a nonce with constant-time comparison
   * @param {string} nonce - The nonce to validate
   * @returns {boolean} True if nonce is valid and not expired
   */
  validate(nonce) {
    // Input validation
    if (!nonce || typeof nonce !== 'string') {
      return false;
    }

    // Check format: must be 32 hex characters
    if (!/^[0-9a-f]{32}$/i.test(nonce)) {
      return false;
    }

    // Retrieve stored nonce
    const stored = this.nonces.get(nonce);
    if (!stored) {
      return false;
    }

    // Check expiration
    const now = Date.now();
    if (now > stored.expiresAt) {
      // Clean up expired nonce
      this.nonces.delete(nonce);
      return false;
    }

    // Use constant-time comparison to prevent timing attacks
    const isValid = this.timingSafeCompare(nonce, stored.value);

    // If valid, remove from storage (one-time use)
    if (isValid) {
      this.nonces.delete(nonce);
    }

    return isValid;
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   * @param {string} a - First string
   * @param {string} b - Second string
   * @returns {boolean} True if strings match
   * @private
   */
  timingSafeCompare(a, b) {
    // Check both inputs are strings
    if (typeof a !== 'string' || typeof b !== 'string') {
      return false;
    }

    // Constant-time comparison: always compare all characters
    // even if lengths differ or mismatch is found early
    let result = 0;

    // Compare lengths using XOR (0 if equal, non-zero if different)
    result |= a.length ^ b.length;

    // Compare characters up to the longer string's length
    const maxLength = Math.max(a.length, b.length);
    for (let i = 0; i < maxLength; i++) {
      // Use charCodeAt with fallback to 0 for out-of-bounds access
      const charA = i < a.length ? a.charCodeAt(i) : 0;
      const charB = i < b.length ? b.charCodeAt(i) : 0;

      // XOR comparison: 0 if equal, non-zero if different
      result |= charA ^ charB;
    }

    // Return true only if result is 0 (all comparisons matched)
    return result === 0;
  }

  /**
   * Start automatic cleanup of expired nonces
   * @private
   */
  startCleanup() {
    // Schedule automatic cleanup of expired nonces
    // Run every CLEANUP_INTERVAL_MS (60 seconds)
    setInterval(() => {
      this.cleanupExpiredNonces();
    }, NonceManager.CONFIG.CLEANUP_INTERVAL_MS);
  }

  /**
   * Clean up expired nonces
   * @returns {number} Number of nonces cleaned up
   * @private
   */
  cleanupExpiredNonces() {
    const now = Date.now();
    let cleanedCount = 0;

    // Iterate through all nonces and delete expired ones
    for (const [nonce, data] of this.nonces.entries()) {
      if (now > data.expiresAt) {
        this.nonces.delete(nonce);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Clear all nonces (for testing)
   */
  clear() {
    this.nonces.clear();
  }

  /**
   * Get nonce count (for testing/debugging)
   * @returns {number}
   */
  size() {
    return this.nonces.size;
  }
}

// Create singleton instance
const nonceManager = new NonceManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NonceManager, nonceManager };
}

// Make available globally for extension context
if (typeof window !== 'undefined') {
  window.ShoplineNonceManager = { NonceManager, nonceManager };
}
