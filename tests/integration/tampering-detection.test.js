/**
 * Tampering Detection Test Suite
 * Phase 1.8.2: Verify system detects all message tampering attempts
 */

'use strict';

const { MessageValidator } = require('../../src/shared/security/message-validator.js');
const { MessageSigner } = require('../../src/shared/security/message-signer.js');
const { CrossWorldValidator } = require('../../src/shared/security/cross-world-validator.js');

describe('Tampering Detection Tests', () => {
  test('should detect signature tampering', async (done) => {
    const signer = new MessageSigner();
    const validator = new CrossWorldValidator({ securityLevel: 'strict' });

    try {
      // Setup
      const secret = 'shared-secret-key';
      const key = await signer.generateSigningKey(secret);
      validator.setSigningKey(key);

      // Create valid message
      const nonce = await validator.generateNonce();
      const message = {
        type: 'categoryMoved',
        payload: { fromId: '42', toId: '37', timestamp: Date.now() },
        source: 'scm-injected',
        nonce: nonce,
        signature: ''
      };

      // Sign message
      message.signature = await signer.signMessage(message, key);
      console.log('✓ Original message signed');

      // Attacker tampers with signature (flip last character)
      const tampered = message.signature.slice(0, -1) +
        (message.signature[message.signature.length - 1] === 'a' ? 'b' : 'a');
      message.signature = tampered;
      console.log('✓ Signature tampered');

      // Validation should fail
      const result = await validator.validateMessage(message);
      if (result.valid) {
        throw new Error('Tampered signature was accepted - SECURITY BREACH');
      }
      console.log('✓ Tampered signature correctly rejected');
      done();
    } catch (err) {
      done(err);
    }
  });

  test('should detect payload tampering', async (done) => {
    const signer = new MessageSigner();
    const validator = new CrossWorldValidator({ securityLevel: 'strict' });

    try {
      // Setup
      const secret = 'shared-secret-key';
      const key = await signer.generateSigningKey(secret);
      validator.setSigningKey(key);

      // Create valid message
      const nonce = await validator.generateNonce();
      const message = {
        type: 'categoryMoved',
        payload: { fromId: '42', toId: '37', timestamp: Date.now() },
        source: 'scm-injected',
        nonce: nonce,
        signature: ''
      };

      // Sign message
      message.signature = await signer.signMessage(message, key);
      console.log('✓ Original message signed');

      // Attacker tampers with payload (change fromId)
      message.payload.fromId = '99';
      console.log('✓ Payload tampered (fromId changed)');

      // Validation should fail (signature won't match)
      const result = await validator.validateMessage(message);
      if (result.valid) {
        throw new Error('Tampered payload was accepted - SECURITY BREACH');
      }
      console.log('✓ Tampered payload correctly rejected');
      done();
    } catch (err) {
      done(err);
    }
  });

  test('should detect message type tampering', async (done) => {
    const validator = new CrossWorldValidator({ securityLevel: 'moderate' });

    try {
      // Create message with invalid type
      const message = {
        type: 'maliciousOperation',  // Invalid type
        payload: { ready: true },
        source: 'scm-injected',
        nonce: '12345678901234567890123456789012',
        signature: ''
      };

      const result = await validator.validateMessage(message);
      if (result.valid) {
        throw new Error('Invalid message type was accepted - SECURITY BREACH');
      }
      console.log('✓ Invalid message type correctly rejected');
      done();
    } catch (err) {
      done(err);
    }
  });

  test('should detect source tampering', async (done) => {
    const validator = new CrossWorldValidator({ securityLevel: 'moderate' });

    try {
      // Create message with spoofed source
      const message = {
        type: 'categoryManagerReady',
        payload: { ready: true },
        source: 'page-script',  // Invalid - should be scm-injected or scm-content-script
        nonce: '12345678901234567890123456789012',
        signature: ''
      };

      const result = await validator.validateMessage(message);
      if (result.valid) {
        throw new Error('Spoofed source was accepted - SECURITY BREACH');
      }
      console.log('✓ Spoofed source correctly rejected');
      done();
    } catch (err) {
      done(err);
    }
  });

  test('should detect nonce replay attacks', async (done) => {
    const validator = new CrossWorldValidator({ securityLevel: 'moderate' });

    try {
      // Generate nonce and use it once
      const nonce = await validator.generateNonce();

      const message1 = {
        type: 'categoryManagerReady',
        payload: { ready: true },
        source: 'scm-injected',
        nonce: nonce,
        signature: ''
      };

      // First use succeeds
      const result1 = await validator.validateMessage(message1);
      if (!result1.valid) {
        throw new Error('Fresh nonce should be valid');
      }
      console.log('✓ First message with nonce validated');

      // Attacker tries to replay with same nonce
      const message2 = {
        type: 'categoryManagerReady',
        payload: { ready: true },
        source: 'scm-injected',
        nonce: nonce,  // Reused nonce
        signature: ''
      };

      const result2 = await validator.validateMessage(message2);
      if (result2.valid) {
        throw new Error('Replayed nonce was accepted - SECURITY BREACH');
      }
      console.log('✓ Replay attack correctly detected');
      done();
    } catch (err) {
      done(err);
    }
  });

  test('should detect empty payload tampering', async (done) => {
    const validator = new CrossWorldValidator({ securityLevel: 'basic' });

    try {
      // Create message with empty payload
      const message = {
        type: 'categoryManagerReady',
        payload: {},  // Empty payload - invalid
        source: 'scm-injected',
        nonce: '12345678901234567890123456789012',
        signature: ''
      };

      const result = await validator.validateMessage(message);
      if (result.valid) {
        throw new Error('Empty payload was accepted - SECURITY BREACH');
      }
      console.log('✓ Empty payload correctly rejected');
      done();
    } catch (err) {
      done(err);
    }
  });

  test('should detect missing critical fields', async (done) => {
    const validator = new CrossWorldValidator({ securityLevel: 'basic' });

    try {
      // Test each missing required field
      const requiredFields = ['type', 'payload', 'source', 'nonce', 'signature'];

      for (const field of requiredFields) {
        const message = {
          type: 'categoryManagerReady',
          payload: { ready: true },
          source: 'scm-injected',
          nonce: '12345678901234567890123456789012',
          signature: ''
        };

        // Remove the field
        delete message[field];

        const result = await validator.validateMessage(message);
        if (result.valid) {
          throw new Error(`Missing field '${field}' was accepted - SECURITY BREACH`);
        }
      }
      console.log('✓ All missing critical fields correctly detected');
      done();
    } catch (err) {
      done(err);
    }
  });

  test('should detect nonce format tampering', async (done) => {
    const validator = new CrossWorldValidator({ securityLevel: 'moderate' });

    try {
      // Test invalid nonce formats
      const invalidNonces = [
        'tooshort',  // Too short
        '12345678901234567890123456789012!',  // Non-hex character
        'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz',  // Too long
        '1234567890123456789012345678901',   // 31 chars instead of 32
        '123456789012345678901234567890123',  // 33 chars instead of 32
      ];

      for (const nonce of invalidNonces) {
        const message = {
          type: 'categoryManagerReady',
          payload: { ready: true },
          source: 'scm-injected',
          nonce: nonce,
          signature: ''
        };

        const result = await validator.validateMessage(message);
        if (result.valid) {
          throw new Error(`Invalid nonce format '${nonce}' was accepted - SECURITY BREACH`);
        }
      }
      console.log('✓ All invalid nonce formats correctly detected');
      done();
    } catch (err) {
      done(err);
    }
  });
});

// Export for test framework
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {};
}
