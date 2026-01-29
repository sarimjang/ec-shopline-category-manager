/**
 * MessageSigner Tests
 * Test suite for message signing and signature verification
 */

'use strict';

const { MessageSigner, messageSigner } = require('../../src/shared/security/message-signer.js');

/**
 * Test Suite: Crypto Availability
 */
describe('MessageSigner - Crypto Availability', () => {
  test('should detect crypto API availability', (done) => {
    const signer = new MessageSigner();
    const available = signer._isCryptoAvailable ? true : false;

    // Crypto should be available in Node.js environment
    expect(available).toBe(true);
    done();
  });

  test('should provide algorithm information', (done) => {
    const algo = messageSigner.getAlgorithm();

    expect(algo.name).toBe('HMAC');
    expect(algo.hash).toBe('SHA-256');
    expect(algo.derivation).toBe('PBKDF2');
    expect(algo.signatureEncoding).toBe('hex');
    expect(algo.keyDerivationIterations).toBeGreaterThan(0);

    done();
  });
});

/**
 * Test Suite: Key Management
 */
describe('MessageSigner - Key Management', () => {
  test('should generate signing key from secret', async (done) => {
    const signer = new MessageSigner();
    const secret = 'my-secret-password';

    try {
      const key = await signer.generateSigningKey(secret);

      expect(key).toBeDefined();
      expect(typeof key).toBe('object');
      expect(key.type).toBe('secret');
      expect(key.algorithm.name).toBe('HMAC');

      done();
    } catch (err) {
      done(err);
    }
  });

  test('should accept salt parameter for key generation', async (done) => {
    const signer = new MessageSigner();
    const secret = 'my-secret';
    const salt = 'my-salt';

    try {
      const key = await signer.generateSigningKey(secret, salt);

      expect(key).toBeDefined();
      done();
    } catch (err) {
      done(err);
    }
  });

  test('should reject empty secret', async (done) => {
    const signer = new MessageSigner();

    try {
      await signer.generateSigningKey('');
      done(new Error('Should have thrown error'));
    } catch (err) {
      expect(err.message).toMatch(/secret/i);
      done();
    }
  });

  test('should set signing key', async (done) => {
    const signer = new MessageSigner();
    const secret = 'test-secret';

    try {
      const key = await signer.generateSigningKey(secret);
      const result = signer.setSigningKey(key);

      expect(result).toBe(true);
      expect(signer.hasKey()).toBe(true);

      done();
    } catch (err) {
      done(err);
    }
  });

  test('should check if key is set', async (done) => {
    const signer = new MessageSigner();

    expect(signer.hasKey()).toBe(false);

    const key = await signer.generateSigningKey('secret');
    signer.setSigningKey(key);

    expect(signer.hasKey()).toBe(true);

    done();
  });

  test('should reject invalid key', (done) => {
    const signer = new MessageSigner();

    const result = signer.setSigningKey(null);
    expect(result).toBe(false);

    const result2 = signer.setSigningKey('not-a-key');
    expect(result2).toBe(false);

    done();
  });
});

/**
 * Test Suite: Message Signing
 */
describe('MessageSigner - Message Signing', () => {
  test('should sign message with key', async (done) => {
    const signer = new MessageSigner();
    const secret = 'test-secret';
    const message = { type: 'test', data: 'hello' };

    try {
      const key = await signer.generateSigningKey(secret);
      const signature = await signer.signMessage(message, key);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(0);
      // Signature should be hex (only 0-9, a-f)
      expect(/^[0-9a-f]+$/.test(signature)).toBe(true);

      done();
    } catch (err) {
      done(err);
    }
  });

  test('should sign message with instance key', async (done) => {
    const signer = new MessageSigner();
    const secret = 'test-secret';
    const message = { type: 'test', data: 'hello' };

    try {
      const key = await signer.generateSigningKey(secret);
      signer.setSigningKey(key);

      const signature = await signer.signMessage(message);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');

      done();
    } catch (err) {
      done(err);
    }
  });

  test('should produce consistent signatures for same message', async (done) => {
    const signer = new MessageSigner();
    const secret = 'test-secret';
    const message = { type: 'test', data: 'hello' };

    try {
      const key = await signer.generateSigningKey(secret);

      const sig1 = await signer.signMessage(message, key);
      const sig2 = await signer.signMessage(message, key);

      expect(sig1).toBe(sig2);

      done();
    } catch (err) {
      done(err);
    }
  });

  test('should produce different signatures for different messages', async (done) => {
    const signer = new MessageSigner();
    const secret = 'test-secret';
    const message1 = { type: 'test', data: 'hello' };
    const message2 = { type: 'test', data: 'world' };

    try {
      const key = await signer.generateSigningKey(secret);

      const sig1 = await signer.signMessage(message1, key);
      const sig2 = await signer.signMessage(message2, key);

      expect(sig1).not.toBe(sig2);

      done();
    } catch (err) {
      done(err);
    }
  });

  test('should reject signing without key', async (done) => {
    const signer = new MessageSigner();
    const message = { type: 'test', data: 'hello' };

    try {
      await signer.signMessage(message);
      done(new Error('Should have thrown error'));
    } catch (err) {
      expect(err.message).toMatch(/key/i);
      done();
    }
  });

  test('should reject invalid message', async (done) => {
    const signer = new MessageSigner();
    const secret = 'test-secret';

    try {
      const key = await signer.generateSigningKey(secret);
      await signer.signMessage('not-object', key);
      done(new Error('Should have thrown error'));
    } catch (err) {
      expect(err.message).toMatch(/message/i);
      done();
    }
  });
});

/**
 * Test Suite: Signature Verification
 */
describe('MessageSigner - Signature Verification', () => {
  test('should verify valid signature', async (done) => {
    const signer = new MessageSigner();
    const secret = 'test-secret';
    const message = { type: 'test', data: 'hello' };

    try {
      const key = await signer.generateSigningKey(secret);
      const signature = await signer.signMessage(message, key);

      const isValid = await signer.verifySignature(message, signature, key);

      expect(isValid).toBe(true);

      done();
    } catch (err) {
      done(err);
    }
  });

  test('should reject invalid signature', async (done) => {
    const signer = new MessageSigner();
    const secret = 'test-secret';
    const message = { type: 'test', data: 'hello' };
    const fakeSignature = 'ffffffffffffffffffffffffffffffff';

    try {
      const key = await signer.generateSigningKey(secret);

      const isValid = await signer.verifySignature(message, fakeSignature, key);

      expect(isValid).toBe(false);

      done();
    } catch (err) {
      done(err);
    }
  });

  test('should reject signature for modified message', async (done) => {
    const signer = new MessageSigner();
    const secret = 'test-secret';
    const message1 = { type: 'test', data: 'hello' };
    const message2 = { type: 'test', data: 'world' };

    try {
      const key = await signer.generateSigningKey(secret);
      const signature = await signer.signMessage(message1, key);

      const isValid = await signer.verifySignature(message2, signature, key);

      expect(isValid).toBe(false);

      done();
    } catch (err) {
      done(err);
    }
  });

  test('should reject signature from different key', async (done) => {
    const signer = new MessageSigner();
    const secret1 = 'secret1';
    const secret2 = 'secret2';
    const message = { type: 'test', data: 'hello' };

    try {
      const key1 = await signer.generateSigningKey(secret1);
      const key2 = await signer.generateSigningKey(secret2);

      const signature = await signer.signMessage(message, key1);
      const isValid = await signer.verifySignature(message, signature, key2);

      expect(isValid).toBe(false);

      done();
    } catch (err) {
      done(err);
    }
  });

  test('should verify with instance key', async (done) => {
    const signer = new MessageSigner();
    const secret = 'test-secret';
    const message = { type: 'test', data: 'hello' };

    try {
      const key = await signer.generateSigningKey(secret);
      signer.setSigningKey(key);

      const signature = await signer.signMessage(message);
      const isValid = await signer.verifySignature(message, signature);

      expect(isValid).toBe(true);

      done();
    } catch (err) {
      done(err);
    }
  });

  test('should handle invalid signature format gracefully', async (done) => {
    const signer = new MessageSigner();
    const secret = 'test-secret';
    const message = { type: 'test', data: 'hello' };

    try {
      const key = await signer.generateSigningKey(secret);

      // Invalid hex signature
      const isValid = await signer.verifySignature(message, 'not-hex', key);

      // Should return false instead of throwing
      expect(isValid).toBe(false);

      done();
    } catch (err) {
      done(err);
    }
  });
});

/**
 * Test Suite: Byte Conversion
 */
describe('MessageSigner - Byte Conversion', () => {
  test('should convert bytes to hex', (done) => {
    const signer = new MessageSigner();
    const bytes = new Uint8Array([0, 1, 15, 255]);

    const hex = signer._bytesToHex(bytes);

    expect(hex).toBe('00010fff');

    done();
  });

  test('should convert hex to bytes', (done) => {
    const signer = new MessageSigner();
    const hex = '00010fff';

    const bytes = signer._hexToBytes(hex);

    expect(bytes.length).toBe(4);
    expect(bytes[0]).toBe(0);
    expect(bytes[1]).toBe(1);
    expect(bytes[2]).toBe(15);
    expect(bytes[3]).toBe(255);

    done();
  });

  test('should round-trip bytes to hex and back', (done) => {
    const signer = new MessageSigner();
    const original = new Uint8Array([1, 2, 3, 4, 5, 255, 254, 253]);

    const hex = signer._bytesToHex(original);
    const restored = signer._hexToBytes(hex);

    // Compare values
    let equal = true;
    if (restored.length !== original.length) {
      equal = false;
    } else {
      for (let i = 0; i < original.length; i++) {
        if (restored[i] !== original[i]) {
          equal = false;
          break;
        }
      }
    }

    expect(equal).toBe(true);

    done();
  });
});

/**
 * Test Suite: Integration
 */
describe('MessageSigner - Integration', () => {
  test('should complete sign-verify cycle', async (done) => {
    const signer = new MessageSigner();
    const secret = 'production-secret';
    const message = {
      type: 'categoryManagerReady',
      payload: { ready: true },
      timestamp: Date.now()
    };

    try {
      // Generate key
      const key = await signer.generateSigningKey(secret);

      // Sign message
      const signature = await signer.signMessage(message, key);
      expect(signature).toBeDefined();

      // Verify signature
      const isValid = await signer.verifySignature(message, signature, key);
      expect(isValid).toBe(true);

      // Modify message and verify it fails
      const modifiedMessage = { ...message, payload: { ready: false } };
      const isValidModified = await signer.verifySignature(modifiedMessage, signature, key);
      expect(isValidModified).toBe(false);

      done();
    } catch (err) {
      done(err);
    }
  });

  test('should work with instance methods', async (done) => {
    const signer = new MessageSigner();
    const secret = 'test-secret';
    const message = { type: 'test', data: 'hello' };

    try {
      // Generate and set key
      const key = await signer.generateSigningKey(secret);
      signer.setSigningKey(key);

      // Sign without passing key
      const signature = await signer.signMessage(message);

      // Verify without passing key
      const isValid = await signer.verifySignature(message, signature);

      expect(isValid).toBe(true);

      done();
    } catch (err) {
      done(err);
    }
  });
});

// Export for test framework
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MessageSigner, messageSigner };
}
