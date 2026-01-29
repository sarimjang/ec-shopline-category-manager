/**
 * CrossWorldValidator Tests
 * Test suite for unified cross-world communication message validation
 */

'use strict';

const { CrossWorldValidator, crossWorldValidator } = require('../../src/shared/security/cross-world-validator.js');
const { NonceManager } = require('../../src/shared/security/nonce-manager.js');
const { MessageValidator } = require('../../src/shared/security/message-validator.js');
const { MessageSigner } = require('../../src/shared/security/message-signer.js');
const { SecurityLogger } = require('../../src/shared/security/security-logger.js');

/**
 * Test Suite: Initialization and Configuration
 */
describe('CrossWorldValidator - Initialization', () => {
  test('should create instance with default configuration', (done) => {
    const validator = new CrossWorldValidator();

    expect(validator).toBeDefined();
    expect(validator.securityLevel).toBe('strict');
    expect(validator.nonceManager).toBeDefined();
    expect(validator.messageValidator).toBeDefined();
    expect(validator.messageSigner).toBeDefined();
    expect(validator.securityLogger).toBeDefined();

    done();
  });

  test('should create instance with custom security level', (done) => {
    const validator = new CrossWorldValidator({
      securityLevel: 'moderate'
    });

    expect(validator.securityLevel).toBe('moderate');

    done();
  });

  test('should accept custom module instances', (done) => {
    const customNonce = new NonceManager();
    const customValidator = new MessageValidator();

    const validator = new CrossWorldValidator({
      nonceManager: customNonce,
      messageValidator: customValidator
    });

    expect(validator.nonceManager).toBe(customNonce);
    expect(validator.messageValidator).toBe(customValidator);

    done();
  });

  test('should set signing key successfully', (done) => {
    const validator = new CrossWorldValidator();
    const mockKey = { type: 'secret', algorithm: { name: 'HMAC' } };

    const result = validator.setSigningKey(mockKey);

    expect(result).toBe(true);
    expect(validator.signingKey).toBe(mockKey);

    done();
  });

  test('should reject invalid signing key', (done) => {
    const validator = new CrossWorldValidator();

    const result1 = validator.setSigningKey(null);
    const result2 = validator.setSigningKey('not-a-key');

    expect(result1).toBe(false);
    expect(result2).toBe(false);

    done();
  });
});

/**
 * Test Suite: Nonce Generation
 */
describe('CrossWorldValidator - Nonce Generation', () => {
  test('should generate valid nonce', async (done) => {
    const validator = new CrossWorldValidator();

    try {
      const nonce = await validator.generateNonce();

      expect(nonce).toBeDefined();
      expect(typeof nonce).toBe('string');
      expect(nonce.length).toBe(32);
      expect(/^[0-9a-f]+$/.test(nonce)).toBe(true);

      done();
    } catch (err) {
      done(err);
    }
  });

  test('should generate different nonces on multiple calls', async (done) => {
    const validator = new CrossWorldValidator();

    try {
      const nonce1 = await validator.generateNonce();
      const nonce2 = await validator.generateNonce();

      expect(nonce1).not.toBe(nonce2);

      done();
    } catch (err) {
      done(err);
    }
  });
});

/**
 * Test Suite: Message Validation - Structure Only (Basic Level)
 */
describe('CrossWorldValidator - Basic Level Validation', () => {
  test('should validate message structure at basic level', async (done) => {
    const validator = new CrossWorldValidator({
      securityLevel: 'basic'
    });

    const message = {
      type: 'categoryManagerReady',
      payload: { ready: true },
      source: 'scm-injected',
      nonce: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
      signature: 'sig123456789'
    };

    try {
      const result = await validator.validateMessage(message);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.details.structureValid).toBe(true);
      expect(result.details.sourceValid).toBe(true);

      done();
    } catch (err) {
      done(err);
    }
  });

  test('should reject incomplete message at basic level', async (done) => {
    const validator = new CrossWorldValidator({
      securityLevel: 'basic'
    });

    const incompleteMessage = {
      type: 'categoryManagerReady',
      payload: { ready: true }
      // Missing source, nonce, signature
    };

    try {
      const result = await validator.validateMessage(incompleteMessage);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      done();
    } catch (err) {
      done(err);
    }
  });
});

/**
 * Test Suite: Message Validation - Nonce Validation (Moderate Level)
 */
describe('CrossWorldValidator - Moderate Level Validation', () => {
  test('should validate message with nonce at moderate level', async (done) => {
    const validator = new CrossWorldValidator({
      securityLevel: 'moderate'
    });

    const nonce = await validator.generateNonce();
    const message = {
      type: 'categoryManagerReady',
      payload: { ready: true },
      source: 'scm-injected',
      nonce: nonce,
      signature: 'sig123456789'
    };

    try {
      const result = await validator.validateMessage(message);

      expect(result.valid).toBe(true);
      expect(result.details.nonceValid).toBe(true);

      done();
    } catch (err) {
      done(err);
    }
  });

  test('should reject invalid nonce at moderate level', async (done) => {
    const validator = new CrossWorldValidator({
      securityLevel: 'moderate'
    });

    const message = {
      type: 'categoryManagerReady',
      payload: { ready: true },
      source: 'scm-injected',
      nonce: 'invalidnoncevalue12345678901234',
      signature: 'sig123456789'
    };

    try {
      const result = await validator.validateMessage(message);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Nonce'))).toBe(true);

      done();
    } catch (err) {
      done(err);
    }
  });

  test('should reject message with missing nonce at moderate level', async (done) => {
    const validator = new CrossWorldValidator({
      securityLevel: 'moderate'
    });

    const message = {
      type: 'categoryManagerReady',
      payload: { ready: true },
      source: 'scm-injected',
      signature: 'sig123456789'
      // Missing nonce
    };

    try {
      const result = await validator.validateMessage(message);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('nonce'))).toBe(true);

      done();
    } catch (err) {
      done(err);
    }
  });
});

/**
 * Test Suite: Message Validation - Full Validation (Strict Level)
 */
describe('CrossWorldValidator - Strict Level Validation', () => {
  test('should require signing key at strict level', async (done) => {
    const validator = new CrossWorldValidator({
      securityLevel: 'strict'
    });

    const nonce = await validator.generateNonce();
    const message = {
      type: 'categoryManagerReady',
      payload: { ready: true },
      source: 'scm-injected',
      nonce: nonce,
      signature: 'sig123456789'
    };

    try {
      const result = await validator.validateMessage(message);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('key'))).toBe(true);

      done();
    } catch (err) {
      done(err);
    }
  });

  test('should validate message with valid signing key at strict level', async (done) => {
    const validator = new CrossWorldValidator({
      securityLevel: 'strict'
    });

    const signer = new MessageSigner();
    const secret = 'test-secret';

    try {
      const key = await signer.generateSigningKey(secret);
      validator.setSigningKey(key);

      const nonce = await validator.generateNonce();
      const message = {
        type: 'categoryManagerReady',
        payload: { ready: true },
        source: 'scm-injected',
        nonce: nonce,
        signature: ''
      };

      // Sign the message
      message.signature = await signer.signMessage(message, key);

      const result = await validator.validateMessage(message);

      expect(result.valid).toBe(true);
      expect(result.details.signatureValid).toBe(true);
      expect(result.details.nonceValid).toBe(true);

      done();
    } catch (err) {
      done(err);
    }
  });

  test('should reject invalid signature at strict level', async (done) => {
    const validator = new CrossWorldValidator({
      securityLevel: 'strict'
    });

    const signer = new MessageSigner();
    const secret = 'test-secret';

    try {
      const key = await signer.generateSigningKey(secret);
      validator.setSigningKey(key);

      const nonce = await validator.generateNonce();
      const message = {
        type: 'categoryManagerReady',
        payload: { ready: true },
        source: 'scm-injected',
        nonce: nonce,
        signature: 'invalidsignaturehex0123456789ab'
      };

      const result = await validator.validateMessage(message);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Signature'))).toBe(true);

      done();
    } catch (err) {
      done(err);
    }
  });

  test('should reject tampered message at strict level', async (done) => {
    const validator = new CrossWorldValidator({
      securityLevel: 'strict'
    });

    const signer = new MessageSigner();
    const secret = 'test-secret';

    try {
      const key = await signer.generateSigningKey(secret);
      validator.setSigningKey(key);

      const nonce = await validator.generateNonce();
      const message = {
        type: 'categoryManagerReady',
        payload: { ready: true },
        source: 'scm-injected',
        nonce: nonce,
        signature: ''
      };

      // Sign the message
      message.signature = await signer.signMessage(message, key);

      // Tamper with the message
      message.payload.ready = false;

      const result = await validator.validateMessage(message);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Signature'))).toBe(true);

      done();
    } catch (err) {
      done(err);
    }
  });
});

/**
 * Test Suite: Source Validation
 */
describe('CrossWorldValidator - Source Validation', () => {
  test('should accept valid scm- prefixed sources', async (done) => {
    const validator = new CrossWorldValidator({
      securityLevel: 'basic'
    });

    const validSources = ['scm-injected', 'scm-content-script'];

    try {
      for (const source of validSources) {
        const message = {
          type: 'categoryManagerReady',
          payload: { ready: true },
          source: source,
          nonce: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
          signature: 'sig123'
        };

        const result = await validator.validateMessage(message);
        expect(result.details.sourceValid).toBe(true);
      }

      done();
    } catch (err) {
      done(err);
    }
  });

  test('should reject invalid source', async (done) => {
    const validator = new CrossWorldValidator({
      securityLevel: 'basic'
    });

    const message = {
      type: 'categoryManagerReady',
      payload: { ready: true },
      source: 'invalid-source',
      nonce: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
      signature: 'sig123'
    };

    try {
      const result = await validator.validateMessage(message);

      expect(result.valid).toBe(false);
      expect(result.details.sourceValid).toBe(false);

      done();
    } catch (err) {
      done(err);
    }
  });
});

/**
 * Test Suite: Validation Result Structure
 */
describe('CrossWorldValidator - Validation Result', () => {
  test('should return proper result structure on success', async (done) => {
    const validator = new CrossWorldValidator({
      securityLevel: 'basic'
    });

    const message = {
      type: 'categoryManagerReady',
      payload: { ready: true },
      source: 'scm-injected',
      nonce: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
      signature: 'sig123'
    };

    try {
      const result = await validator.validateMessage(message);

      expect(result).toBeDefined();
      expect(result.valid).toBeDefined();
      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.details).toBeDefined();
      expect(result.details.structureValid).toBeDefined();
      expect(result.details.sourceValid).toBeDefined();

      done();
    } catch (err) {
      done(err);
    }
  });

  test('should return proper result structure on failure', async (done) => {
    const validator = new CrossWorldValidator({
      securityLevel: 'basic'
    });

    const message = {
      // Missing required fields
    };

    try {
      const result = await validator.validateMessage(message);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.details).toBeDefined();

      done();
    } catch (err) {
      done(err);
    }
  });
});

/**
 * Test Suite: Logging Integration
 */
describe('CrossWorldValidator - Logging', () => {
  test('should log successful validation', async (done) => {
    const validator = new CrossWorldValidator({
      securityLevel: 'basic'
    });

    const message = {
      type: 'categoryManagerReady',
      payload: { ready: true },
      source: 'scm-injected',
      nonce: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
      signature: 'sig123'
    };

    try {
      const logsBefore = validator.getLogs().length;
      await validator.validateMessage(message);
      const logsAfter = validator.getLogs().length;

      expect(logsAfter).toBeGreaterThan(logsBefore);

      done();
    } catch (err) {
      done(err);
    }
  });

  test('should log validation failures', async (done) => {
    const validator = new CrossWorldValidator({
      securityLevel: 'basic'
    });

    const message = {
      // Invalid message
    };

    try {
      const logsBefore = validator.getLogs().length;
      await validator.validateMessage(message);
      const logsAfter = validator.getLogs().length;

      expect(logsAfter).toBeGreaterThan(logsBefore);

      done();
    } catch (err) {
      done(err);
    }
  });

  test('should retrieve logs by type', async (done) => {
    const validator = new CrossWorldValidator({
      securityLevel: 'basic'
    });

    try {
      const logs = validator.getLogs('MESSAGE_VALIDATED');
      expect(Array.isArray(logs)).toBe(true);

      done();
    } catch (err) {
      done(err);
    }
  });

  test('should clear logs', async (done) => {
    const validator = new CrossWorldValidator({
      securityLevel: 'basic'
    });

    const message = {
      type: 'categoryManagerReady',
      payload: { ready: true },
      source: 'scm-injected',
      nonce: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
      signature: 'sig123'
    };

    try {
      await validator.validateMessage(message);
      const logsBefore = validator.getLogs().length;
      expect(logsBefore).toBeGreaterThan(0);

      validator.clearLogs();
      const logsAfter = validator.getLogs().length;
      expect(logsAfter).toBe(0);

      done();
    } catch (err) {
      done(err);
    }
  });
});

/**
 * Test Suite: Statistics and Configuration
 */
describe('CrossWorldValidator - Statistics and Config', () => {
  test('should provide validation statistics', (done) => {
    const validator = new CrossWorldValidator({
      securityLevel: 'strict'
    });

    const stats = validator.getStatistics();

    expect(stats).toBeDefined();
    expect(stats.securityLevel).toBe('strict');
    expect(stats.nonceManager).toBeDefined();
    expect(stats.logger).toBeDefined();

    done();
  });

  test('should provide validator configuration', (done) => {
    const validator = new CrossWorldValidator({
      securityLevel: 'moderate'
    });

    const config = validator.getConfig();

    expect(config).toBeDefined();
    expect(config.securityLevel).toBe('moderate');
    expect(config.nonceConfig).toBeDefined();
    expect(config.messageSignerConfig).toBeDefined();

    done();
  });
});

/**
 * Test Suite: Integration with All Modules
 */
describe('CrossWorldValidator - Full Integration', () => {
  test('should perform complete secure message validation', async (done) => {
    const validator = new CrossWorldValidator({
      securityLevel: 'strict'
    });

    const signer = new MessageSigner();
    const secret = 'production-secret-12345';

    try {
      // Generate signing key
      const key = await signer.generateSigningKey(secret);
      validator.setSigningKey(key);

      // Generate nonce
      const nonce = await validator.generateNonce();

      // Create message
      const message = {
        type: 'categoryManagerReady',
        payload: { ready: true, timestamp: Date.now() },
        source: 'scm-injected',
        nonce: nonce,
        signature: ''
      };

      // Sign message
      message.signature = await signer.signMessage(message, key);

      // Validate message
      const result = await validator.validateMessage(message);

      expect(result.valid).toBe(true);
      expect(result.details.structureValid).toBe(true);
      expect(result.details.sourceValid).toBe(true);
      expect(result.details.nonceValid).toBe(true);
      expect(result.details.signatureValid).toBe(true);

      done();
    } catch (err) {
      done(err);
    }
  });

  test('should detect tampering in complete integration', async (done) => {
    const validator = new CrossWorldValidator({
      securityLevel: 'strict'
    });

    const signer = new MessageSigner();
    const secret = 'production-secret-12345';

    try {
      // Setup
      const key = await signer.generateSigningKey(secret);
      validator.setSigningKey(key);
      const nonce = await validator.generateNonce();

      // Create and sign original message
      const message = {
        type: 'categoryManagerReady',
        payload: { ready: true },
        source: 'scm-injected',
        nonce: nonce,
        signature: ''
      };

      message.signature = await signer.signMessage(message, key);

      // Tamper: try to change payload
      message.payload.ready = false;

      // Validate tampered message
      const result = await validator.validateMessage(message);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Signature'))).toBe(true);

      done();
    } catch (err) {
      done(err);
    }
  });
});

/**
 * Test Suite: Error Handling
 */
describe('CrossWorldValidator - Error Handling', () => {
  test('should handle null message gracefully', async (done) => {
    const validator = new CrossWorldValidator({
      securityLevel: 'basic'
    });

    try {
      const result = await validator.validateMessage(null);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      done();
    } catch (err) {
      done(err);
    }
  });

  test('should handle undefined message gracefully', async (done) => {
    const validator = new CrossWorldValidator({
      securityLevel: 'basic'
    });

    try {
      const result = await validator.validateMessage(undefined);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      done();
    } catch (err) {
      done(err);
    }
  });

  test('should handle non-object message gracefully', async (done) => {
    const validator = new CrossWorldValidator({
      securityLevel: 'basic'
    });

    try {
      const result = await validator.validateMessage('not an object');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      done();
    } catch (err) {
      done(err);
    }
  });
});

// Export for test framework
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CrossWorldValidator };
}
