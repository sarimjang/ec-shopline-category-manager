/**
 * MessageValidator Tests
 * Test suite for message structure and security validation
 */

'use strict';

const { MessageValidator, messageValidator } = require('../../src/shared/security/message-validator.js');

/**
 * Test Suite: Message Structure Validation
 */
describe('MessageValidator - Structure Validation', () => {
  test('should validate correct message structure', () => {
    const message = {
      type: MessageValidator.CONFIG.MESSAGE_TYPES.CATEGORY_MANAGER_READY,
      payload: { ready: true },
      source: 'scm-injected',
      nonce: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
      signature: 'sig123456789'
    };

    const result = messageValidator.validateMessageStructure(message);

    expect(result.valid).toBe(true);
    expect(result.errors).toBeDefined();
    expect(result.errors.length).toBe(0);
  });

  test('should reject null message', () => {
    const result = messageValidator.validateMessageStructure(null);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('should reject non-object message', () => {
    const result = messageValidator.validateMessageStructure('not an object');

    expect(result.valid).toBe(false);
  });

  test('should detect missing required fields', () => {
    const incompleteMessage = {
      type: MessageValidator.CONFIG.MESSAGE_TYPES.CATEGORY_MANAGER_READY,
      payload: { ready: true }
      // Missing source, nonce, signature
    };

    const result = messageValidator.validateMessageStructure(incompleteMessage);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('should detect each missing required field', () => {
    const messageWithoutNonce = {
      type: MessageValidator.CONFIG.MESSAGE_TYPES.CATEGORY_MANAGER_READY,
      payload: { ready: true },
      source: 'scm-injected',
      signature: 'sig123'
      // Missing nonce
    };

    const result = messageValidator.validateMessageStructure(messageWithoutNonce);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('nonce'))).toBe(true);
  });

  test('should reject empty payload', () => {
    const messageWithEmptyPayload = {
      type: MessageValidator.CONFIG.MESSAGE_TYPES.CATEGORY_MANAGER_READY,
      payload: {},
      source: 'scm-injected',
      nonce: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
      signature: 'sig123'
    };

    const result = messageValidator.validateMessageStructure(messageWithEmptyPayload);

    expect(result.valid).toBe(false);
  });

  test('should include field names in validation errors', () => {
    const incompleteMessage = {
      type: MessageValidator.CONFIG.MESSAGE_TYPES.CATEGORY_MANAGER_READY
      // Missing payload, source, nonce, signature
    };

    const result = messageValidator.validateMessageStructure(incompleteMessage);

    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(Array.isArray(result.errors)).toBe(true);
  });
});

/**
 * Test Suite: Source Validation
 */
describe('MessageValidator - Source Validation', () => {
  test('should validate correct source format', () => {
    const result = messageValidator.validateSource('scm-injected');

    expect(result.valid).toBe(true);
    expect(result.error).toBe(null);
  });

  test('should validate source with different scm- prefix variations', () => {
    const sources = ['scm-injected', 'scm-content-script', 'scm-bridge', 'scm-app'];

    sources.forEach(source => {
      const result = messageValidator.validateSource(source);
      expect(result.valid).toBe(true);
    });
  });

  test('should reject source without scm- prefix', () => {
    const result = messageValidator.validateSource('injected');

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('should reject invalid source prefix', () => {
    const result = messageValidator.validateSource('xyz-injected');

    expect(result.valid).toBe(false);
  });

  test('should reject null/undefined source', () => {
    const resultNull = messageValidator.validateSource(null);
    const resultUndefined = messageValidator.validateSource(undefined);

    expect(resultNull.valid).toBe(false);
    expect(resultUndefined.valid).toBe(false);
  });

  test('should reject non-string source', () => {
    const result = messageValidator.validateSource({ source: 'scm-injected' });

    expect(result.valid).toBe(false);
  });
});

/**
 * Test Suite: Nonce Validation
 */
describe('MessageValidator - Nonce Validation', () => {
  test('should validate correct nonce format', () => {
    const validNonce = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';

    const result = messageValidator.validateNonce(validNonce);

    expect(result.valid).toBe(true);
    expect(result.error).toBe(null);
  });

  test('should validate 32 hex character nonce', () => {
    const nonce = 'ffffffffffffffffffffffffffffffff';

    const result = messageValidator.validateNonce(nonce);

    expect(result.valid).toBe(true);
  });

  test('should validate nonce with uppercase hex', () => {
    const nonce = 'A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4';

    const result = messageValidator.validateNonce(nonce);

    expect(result.valid).toBe(true);
  });

  test('should reject nonce with incorrect length', () => {
    const tooShort = 'a1b2c3d4';
    const tooLong = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4extra';

    const resultShort = messageValidator.validateNonce(tooShort);
    const resultLong = messageValidator.validateNonce(tooLong);

    expect(resultShort.valid).toBe(false);
    expect(resultLong.valid).toBe(false);
  });

  test('should reject nonce with non-hex characters', () => {
    const invalidNonce = 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz';

    const result = messageValidator.validateNonce(invalidNonce);

    expect(result.valid).toBe(false);
  });

  test('should reject null/undefined nonce', () => {
    const resultNull = messageValidator.validateNonce(null);
    const resultUndefined = messageValidator.validateNonce(undefined);

    expect(resultNull.valid).toBe(false);
    expect(resultUndefined.valid).toBe(false);
  });

  test('should reject empty nonce', () => {
    const result = messageValidator.validateNonce('');

    expect(result.valid).toBe(false);
  });

  test('should reject non-string nonce', () => {
    const result = messageValidator.validateNonce({ nonce: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4' });

    expect(result.valid).toBe(false);
  });
});

/**
 * Test Suite: Signature Validation
 */
describe('MessageValidator - Signature Validation', () => {
  test('should validate non-empty signature', () => {
    const result = messageValidator.validateSignature('sig123456789abcdef');

    expect(result.valid).toBe(true);
    expect(result.error).toBe(null);
  });

  test('should reject null/undefined signature', () => {
    const resultNull = messageValidator.validateSignature(null);
    const resultUndefined = messageValidator.validateSignature(undefined);

    expect(resultNull.valid).toBe(false);
    expect(resultUndefined.valid).toBe(false);
  });

  test('should reject empty signature', () => {
    const result = messageValidator.validateSignature('');

    expect(result.valid).toBe(false);
  });

  test('should reject non-string signature', () => {
    const result = messageValidator.validateSignature({ signature: 'sig123' });

    expect(result.valid).toBe(false);
  });
});

/**
 * Test Suite: Message Type Validation
 */
describe('MessageValidator - Message Type Validation', () => {
  test('should validate known message types', () => {
    const types = Object.values(MessageValidator.CONFIG.MESSAGE_TYPES);

    types.forEach(type => {
      const result = messageValidator.validateMessageType(type);
      expect(result.valid).toBe(true);
    });
  });

  test('should reject unknown message type', () => {
    const result = messageValidator.validateMessageType('unknownType');

    expect(result.valid).toBe(false);
  });

  test('should reject null/undefined type', () => {
    const resultNull = messageValidator.validateMessageType(null);
    const resultUndefined = messageValidator.validateMessageType(undefined);

    expect(resultNull.valid).toBe(false);
    expect(resultUndefined.valid).toBe(false);
  });

  test('should reject non-string type', () => {
    const result = messageValidator.validateMessageType({ type: 'categoryManagerReady' });

    expect(result.valid).toBe(false);
  });
});

/**
 * Test Suite: Comprehensive Validation
 */
describe('MessageValidator - Comprehensive Validation', () => {
  test('should validate complete valid message', () => {
    const validMessage = {
      type: MessageValidator.CONFIG.MESSAGE_TYPES.CATEGORY_MANAGER_READY,
      payload: { ready: true },
      source: 'scm-injected',
      nonce: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
      signature: 'sig123456789'
    };

    const result = messageValidator.validate(validMessage);

    expect(result.valid).toBe(true);
    expect(result.errors).toBeDefined();
  });

  test('should aggregate all validation errors', () => {
    const invalidMessage = {
      type: 'unknownType',
      payload: { data: true }, // Valid payload
      source: 'invalid-source',
      nonce: 'short',
      signature: ''
    };

    const result = messageValidator.validate(invalidMessage);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });

  test('should provide detailed error information', () => {
    const invalidMessage = {
      type: MessageValidator.CONFIG.MESSAGE_TYPES.CATEGORY_MANAGER_READY,
      payload: { ready: true },
      source: 'invalid',
      nonce: 'invalid',
      signature: 'sig'
    };

    const result = messageValidator.validate(invalidMessage);

    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('should include validation status in result', () => {
    const message = {
      type: MessageValidator.CONFIG.MESSAGE_TYPES.CATEGORY_MANAGER_READY,
      payload: { ready: true },
      source: 'scm-injected',
      nonce: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
      signature: 'sig123'
    };

    const result = messageValidator.validate(message);

    expect(result).toBeDefined();
    expect(result.valid).toBeDefined();
    expect(result.errors).toBeDefined();
  });
});

/**
 * Test Suite: Error Messages
 */
describe('MessageValidator - Error Messages', () => {
  test('should provide error message for missing field', () => {
    const message = messageValidator.getErrorMessage(
      MessageValidator.CONFIG.ERROR_CODES.MISSING_REQUIRED_FIELD,
      { field: 'nonce' }
    );

    expect(message).toBeDefined();
    expect(typeof message).toBe('string');
    expect(message.length).toBeGreaterThan(0);
  });

  test('should provide error message for invalid source', () => {
    const message = messageValidator.getErrorMessage(
      MessageValidator.CONFIG.ERROR_CODES.INVALID_SOURCE,
      { source: 'invalid' }
    );

    expect(message).toBeDefined();
    expect(typeof message).toBe('string');
  });

  test('should provide error message for invalid nonce format', () => {
    const message = messageValidator.getErrorMessage(
      MessageValidator.CONFIG.ERROR_CODES.INVALID_NONCE_FORMAT,
      { provided: 'abc' }
    );

    expect(message).toBeDefined();
    expect(typeof message).toBe('string');
  });

  test('should provide error message for missing nonce', () => {
    const message = messageValidator.getErrorMessage(
      MessageValidator.CONFIG.ERROR_CODES.MISSING_NONCE
    );

    expect(message).toBeDefined();
    expect(typeof message).toBe('string');
  });

  test('should provide error message for missing signature', () => {
    const message = messageValidator.getErrorMessage(
      MessageValidator.CONFIG.ERROR_CODES.MISSING_SIGNATURE
    );

    expect(message).toBeDefined();
    expect(typeof message).toBe('string');
  });
});

// Export for test framework
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MessageValidator, messageValidator };
}
