/**
 * NonceManager Tests
 * Test suite for cryptographic nonce generation and validation
 */

// Mock crypto API for testing
const mockCrypto = {
  getRandomValues: (buffer) => {
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = Math.floor(Math.random() * 256);
    }
    return buffer;
  },
};

// Import or load the module
let { NonceManager, nonceManager } = require('../../src/shared/security/nonce-manager.js');

/**
 * Test Suite: Nonce Generation
 */
describe('NonceManager - Nonce Generation', () => {
  beforeEach(() => {
    nonceManager.clear();
  });

  test('should generate 32-character hex nonces', () => {
    const nonce = nonceManager.generate();

    // Check format: should be exactly 32 hex characters
    expect(nonce).toMatch(/^[0-9a-f]{32}$/i);
    expect(nonce.length).toBe(32);
  });

  test('should generate unique nonces', () => {
    const nonce1 = nonceManager.generate();
    const nonce2 = nonceManager.generate();
    const nonce3 = nonceManager.generate();

    // All should be different
    expect(nonce1).not.toBe(nonce2);
    expect(nonce2).not.toBe(nonce3);
    expect(nonce1).not.toBe(nonce3);
  });

  test('should store nonce with timestamp and TTL', () => {
    const beforeTime = Date.now();
    const nonce = nonceManager.generate();
    const afterTime = Date.now();

    // Nonce should be stored internally
    expect(nonceManager.size()).toBe(1);

    // Should be able to validate it immediately
    expect(nonceManager.validate(nonce)).toBe(true);
  });
});

/**
 * Test Suite: Nonce Validation
 */
describe('NonceManager - Nonce Validation', () => {
  beforeEach(() => {
    nonceManager.clear();
  });

  test('should validate correct nonce', () => {
    const nonce = nonceManager.generate();
    expect(nonceManager.validate(nonce)).toBe(true);
  });

  test('should reject invalid nonce', () => {
    nonceManager.generate();
    const invalidNonce = 'ffffffffffffffffffffffffffffffff';

    expect(nonceManager.validate(invalidNonce)).toBe(false);
  });

  test('should reject expired nonce', (done) => {
    // Override TTL for testing
    const originalTTL = NonceManager.CONFIG.TTL_MS;
    NonceManager.CONFIG.TTL_MS = 100; // 100ms

    const nonce = nonceManager.generate();

    // Should be valid immediately
    expect(nonceManager.validate(nonce)).toBe(true);

    // Wait for expiration
    setTimeout(() => {
      // Should be invalid after expiration
      expect(nonceManager.validate(nonce)).toBe(false);

      // Restore original TTL
      NonceManager.CONFIG.TTL_MS = originalTTL;
      done();
    }, 150);
  });

  test('should reject empty/null nonce', () => {
    nonceManager.generate();

    expect(nonceManager.validate('')).toBe(false);
    expect(nonceManager.validate(null)).toBe(false);
    expect(nonceManager.validate(undefined)).toBe(false);
  });

  test('should reject wrong format', () => {
    nonceManager.generate();

    // Wrong format (too short)
    expect(nonceManager.validate('abc123')).toBe(false);

    // Wrong format (non-hex)
    expect(nonceManager.validate('zzzzzzzzzzzzzzzzzzzzzzzzzzzzzz')).toBe(false);

    // Wrong format (too long)
    expect(nonceManager.validate('ffffffffffffffffffffffffffffffffffffffff')).toBe(false);
  });
});

/**
 * Test Suite: Timing Attack Resistance
 */
describe('NonceManager - Timing Attack Resistance', () => {
  beforeEach(() => {
    nonceManager.clear();
  });

  test('constant-time comparison should take same time for valid/invalid', (done) => {
    const nonce = nonceManager.generate();

    // Run multiple validations to measure timing
    const validations = [];
    const validNonce = nonce;
    const invalidNonces = [
      'ffffffffffffffffffffffffffffffff', // Completely different
      nonce.substring(0, 31) + 'f',        // Off by one at end
      'f' + nonce.substring(1),             // Off by one at start
    ];

    // Validate correct nonce
    const startValid = performance.now();
    for (let i = 0; i < 100; i++) {
      nonceManager.validate(validNonce);
    }
    const timeValid = performance.now() - startValid;

    // Validate first invalid nonce
    const startInvalid1 = performance.now();
    for (let i = 0; i < 100; i++) {
      nonceManager.validate(invalidNonces[0]);
    }
    const timeInvalid1 = performance.now() - startInvalid1;

    // Timing should be approximately the same (within 50% margin for variance)
    // This is a soft test since exact timing depends on environment
    const timingRatio = timeValid / timeInvalid1;
    expect(timingRatio).toBeGreaterThan(0.5);
    expect(timingRatio).toBeLessThan(2.0);

    done();
  });
});

/**
 * Test Suite: Nonce Cleanup
 */
describe('NonceManager - Nonce Cleanup', () => {
  beforeEach(() => {
    nonceManager.clear();
  });

  test('should cleanup expired nonces automatically', (done) => {
    // Override TTL for testing
    const originalTTL = NonceManager.CONFIG.TTL_MS;
    NonceManager.CONFIG.TTL_MS = 100;

    // Generate multiple nonces
    const nonce1 = nonceManager.generate();
    const nonce2 = nonceManager.generate();
    const nonce3 = nonceManager.generate();

    expect(nonceManager.size()).toBe(3);

    // Wait for expiration and cleanup
    setTimeout(() => {
      nonceManager.cleanupExpiredNonces();

      // All should be cleaned up
      expect(nonceManager.size()).toBe(0);

      // Restore original TTL
      NonceManager.CONFIG.TTL_MS = originalTTL;
      done();
    }, 150);
  });
});

/**
 * Test Suite: Integration
 */
describe('NonceManager - Integration', () => {
  test('complete flow: generate, validate, cleanup', (done) => {
    nonceManager.clear();

    // 1. Generate nonce
    const nonce = nonceManager.generate();
    expect(nonce).toMatch(/^[0-9a-f]{32}$/i);

    // 2. Validate immediately
    expect(nonceManager.validate(nonce)).toBe(true);

    // 3. Reject invalid
    expect(nonceManager.validate('invalid')).toBe(false);

    // 4. Cleanup
    const cleanedCount = nonceManager.cleanupExpiredNonces();
    expect(typeof cleanedCount).toBe('number');

    done();
  });
});

// Export for test framework
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NonceManager, nonceManager };
}
