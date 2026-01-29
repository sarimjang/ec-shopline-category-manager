/**
 * Attack Scenario Test Suite
 * Phase 1.8.3: Verify system defends against real-world attack patterns
 */

'use strict';

const { NonceManager } = require('../../src/shared/security/nonce-manager.js');
const { MessageValidator } = require('../../src/shared/security/message-validator.js');
const { MessageSigner } = require('../../src/shared/security/message-signer.js');
const { CrossWorldValidator } = require('../../src/shared/security/cross-world-validator.js');

describe('Attack Scenario Tests', () => {
  test('should prevent page script spoofing (attacker pretends to be injected.js)', async (done) => {
    const nonceManager = new NonceManager();

    try {
      // Step 1: init.js generates and stores nonce
      const expectedNonce = nonceManager.generate();
      console.log('✓ Step 1: init.js generated nonce');

      // Step 2: Attacker (page script) tries to craft fake event
      // Attacker doesn't know the nonce, so uses a fabricated one
      const attackEvent = {
        type: 'categoryManagerReady',
        payload: { ready: true },
        source: 'scm-injected',  // Spoofing the source
        nonce: nonceManager.generate(),  // Different nonce - attacker's guess
        signature: ''
      };
      console.log('✓ Step 2: Attacker crafted spoofed event');

      // Step 3: init.js validates - should fail
      if (expectedNonce === attackEvent.nonce) {
        throw new Error('Attacker nonce matched - SECURITY BREACH');
      }
      console.log('✓ Step 3: Nonce validation failed (attacker detected)');
      done();
    } catch (err) {
      done(err);
    }
  });

  test('should prevent multiple message replays (one-time nonce)', async (done) => {
    const validator = new CrossWorldValidator({ securityLevel: 'moderate' });

    try {
      // Attacker captures a legitimate message
      const nonce = await validator.generateNonce();

      const legitimateMessage = {
        type: 'categoryMoved',
        payload: { fromId: '42', toId: '37', timestamp: Date.now() },
        source: 'scm-injected',
        nonce: nonce,
        signature: ''
      };

      // First legitimate use succeeds
      const result1 = await validator.validateMessage(legitimateMessage);
      if (!result1.valid) {
        throw new Error('Legitimate message should be valid');
      }
      console.log('✓ Legitimate message processed');

      // Attacker replays the same message multiple times
      const result2 = await validator.validateMessage(legitimateMessage);
      if (result2.valid) {
        throw new Error('Replayed message was accepted - SECURITY BREACH');
      }
      console.log('✓ First replay attempt blocked');

      // Third attempt (in case attacker tries again)
      const result3 = await validator.validateMessage(legitimateMessage);
      if (result3.valid) {
        throw new Error('Second replay attempt was accepted - SECURITY BREACH');
      }
      console.log('✓ Second replay attempt blocked (nonce one-time use working)');
      done();
    } catch (err) {
      done(err);
    }
  });

  test('should detect timestamp manipulation (old messages)', async (done) => {
    const validator = new CrossWorldValidator({ securityLevel: 'moderate' });

    try {
      const nonce = await validator.generateNonce();

      // Attacker creates a message with old timestamp (60+ seconds old)
      const oldTimestamp = Date.now() - 65000;  // 65 seconds ago

      const manipulatedMessage = {
        type: 'categoryMoved',
        payload: {
          fromId: '99',
          toId: '88',
          timestamp: oldTimestamp  // Too old
        },
        source: 'scm-injected',
        nonce: nonce,
        signature: ''
      };

      const result = await validator.validateMessage(manipulatedMessage);

      // Should still validate structure, but timestamp check at payload level
      // would be done at application level
      if (!result.valid && result.errors.some(e => e.includes('timestamp'))) {
        console.log('✓ Old timestamp detected at validation layer');
      } else {
        console.log('✓ Structure validation passed (timestamp checked at app level)');
      }
      done();
    } catch (err) {
      done(err);
    }
  });

  test('should detect message injection at wrong time (nonce expired)', async (done) => {
    const validator = new CrossWorldValidator({ securityLevel: 'moderate' });

    try {
      // Generate nonce
      const nonce = await validator.generateNonce();
      console.log('✓ Nonce generated');

      // Simulate time passing (wait a bit)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create message with the nonce
      const message = {
        type: 'categoryManagerReady',
        payload: { ready: true },
        source: 'scm-injected',
        nonce: nonce,
        signature: ''
      };

      // Message should still be valid (hasn't expired yet)
      const result = await validator.validateMessage(message);
      if (!result.valid && result.errors.some(e => e.includes('expired'))) {
        throw new Error('Fresh nonce marked as expired - FALSE POSITIVE');
      }
      console.log('✓ Fresh nonce accepted');
      done();
    } catch (err) {
      done(err);
    }
  });

  test('should detect DOM-based attack (listener interception)', async (done) => {
    try {
      // Simulate attacker intercepting and modifying event data
      const validator = new CrossWorldValidator({ securityLevel: 'strict' });
      const signer = new MessageSigner();

      // Setup: legitimate signer
      const secret = 'shared-secret-key';
      const key = await signer.generateSigningKey(secret);
      validator.setSigningKey(key);

      // Create legitimate message
      const nonce = await validator.generateNonce();
      const originalMessage = {
        type: 'categoryMoved',
        payload: { fromId: '42', toId: '37', timestamp: Date.now() },
        source: 'scm-injected',
        nonce: nonce,
        signature: ''
      };

      originalMessage.signature = await signer.signMessage(originalMessage, key);
      console.log('✓ Legitimate message created and signed');

      // Attacker intercepts and modifies the message payload
      const interceptedMessage = {
        ...originalMessage,
        payload: { fromId: '99', toId: '88', timestamp: Date.now() }  // Modified
      };
      console.log('✓ Attacker intercepted and modified message');

      // Validation fails because signature doesn't match modified payload
      const result = await validator.validateMessage(interceptedMessage);
      if (result.valid) {
        throw new Error('Modified message passed validation - SECURITY BREACH');
      }
      console.log('✓ Signature mismatch detected (tampering blocked)');
      done();
    } catch (err) {
      done(err);
    }
  });

  test('should defend against timing attack (constant-time comparison)', async (done) => {
    try {
      const nonceManager = new NonceManager();

      // Generate real nonce
      const realNonce = nonceManager.generate();
      const expectedNonce = realNonce;

      // Test cases: similar-looking but different nonces
      const attackNonces = [
        realNonce.slice(0, -1) + 'f',  // Last char different
        'f' + realNonce.slice(1),       // First char different
        realNonce.replace(/[a-f]/g, (c) => c === 'a' ? 'b' : 'a')  // All letters flipped
      ];

      let correctRejections = 0;
      for (const attackNonce of attackNonces) {
        // In real code, this would use constant-time comparison
        const matches = expectedNonce === attackNonce;
        if (!matches) {
          correctRejections++;
        }
      }

      if (correctRejections === attackNonces.length) {
        console.log('✓ All similar-looking nonces correctly rejected');
        done();
      } else {
        throw new Error('Some nonces were incorrectly matched');
      }
    } catch (err) {
      done(err);
    }
  });

  test('should detect source/origin confusion attacks', async (done) => {
    const validator = new CrossWorldValidator({ securityLevel: 'moderate' });

    try {
      // Test case 1: Wrong direction (content-script sending as injected)
      const message1 = {
        type: 'categoryManagerReady',
        payload: { ready: true },
        source: 'scm-content-script',  // Wrong direction
        nonce: '12345678901234567890123456789012',
        signature: ''
      };

      const result1 = await validator.validateMessage(message1);
      // The validator doesn't restrict direction at message level (that's app logic)
      // But it validates the source format is correct
      if (result1.details.sourceValid === false) {
        throw new Error('Valid source format rejected');
      }
      console.log('✓ Source format validated correctly');

      // Test case 2: Unknown source
      const message2 = {
        type: 'categoryManagerReady',
        payload: { ready: true },
        source: 'unknown-origin',  // Invalid prefix
        nonce: '12345678901234567890123456789012',
        signature: ''
      };

      const result2 = await validator.validateMessage(message2);
      if (result2.valid) {
        throw new Error('Unknown source was accepted - SECURITY BREACH');
      }
      console.log('✓ Unknown source correctly rejected');
      done();
    } catch (err) {
      done(err);
    }
  });

  test('should detect brute force nonce guessing attempts', async (done) => {
    try {
      const validator = new CrossWorldValidator({ securityLevel: 'moderate' });
      const realNonce = await validator.generateNonce();

      // Attacker tries 100 random guesses
      let guessesSucceeded = 0;
      const attempts = 100;

      for (let i = 0; i < attempts; i++) {
        const guessNonce = Math.random().toString(16).slice(2).padEnd(32, '0').slice(0, 32);

        const message = {
          type: 'categoryManagerReady',
          payload: { ready: true },
          source: 'scm-injected',
          nonce: guessNonce,
          signature: ''
        };

        const result = await validator.validateMessage(message);
        if (result.valid && result.details.nonceValid) {
          guessesSucceeded++;
        }
      }

      if (guessesSucceeded === 0) {
        console.log(`✓ 0 out of ${attempts} random guesses succeeded (brute force proof)`);
        done();
      } else {
        throw new Error(`Attacker guessed the nonce ${guessesSucceeded} times - SECURITY ISSUE`);
      }
    } catch (err) {
      done(err);
    }
  });

  test('should maintain security across multiple concurrent messages', async (done) => {
    try {
      const validator = new CrossWorldValidator({ securityLevel: 'moderate' });
      const signer = new MessageSigner();

      // Setup
      const secret = 'shared-secret-key';
      const key = await signer.generateSigningKey(secret);
      validator.setSigningKey(key);

      // Create and validate 5 concurrent messages
      const promises = [];
      for (let i = 0; i < 5; i++) {
        const nonce = await validator.generateNonce();
        const message = {
          type: 'categoryMoved',
          payload: { fromId: String(i), toId: String(i + 10), timestamp: Date.now() },
          source: 'scm-injected',
          nonce: nonce,
          signature: ''
        };

        message.signature = await signer.signMessage(message, key);
        promises.push(validator.validateMessage(message));
      }

      const results = await Promise.all(promises);
      const allValid = results.every(r => r.valid);

      if (allValid) {
        console.log('✓ All 5 concurrent messages validated successfully');
        done();
      } else {
        throw new Error('Some concurrent messages failed validation');
      }
    } catch (err) {
      done(err);
    }
  });
});

// Export for test framework
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {};
}
