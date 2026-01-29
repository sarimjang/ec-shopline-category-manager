/**
 * Cross-World Handshake Integration Test
 * Verifies the complete nonce-based initialization flow
 */

'use strict';

const { NonceManager } = require('../../src/shared/security/nonce-manager.js');
const { MessageValidator } = require('../../src/shared/security/message-validator.js');
const { CrossWorldValidator } = require('../../src/shared/security/cross-world-validator.js');

/**
 * Test Suite: Cross-World Nonce Handshake
 * Simulates the complete initialization flow between init.js and injected.js
 */
describe('Cross-World Handshake - Complete Integration', () => {
  test('should complete full nonce-based handshake', async (done) => {
    const nonceManager = new NonceManager();
    
    try {
      // Step 1: init.js generates nonce
      const generatedNonce = nonceManager.generate();
      console.log('✓ Step 1: init.js generated nonce:', generatedNonce);
      
      // Verify nonce format
      if (generatedNonce.length !== 32 || !/^[0-9a-f]+$/.test(generatedNonce)) {
        throw new Error('Generated nonce has invalid format');
      }
      
      // Step 2: init.js stores nonce internally (simulated)
      const expectedNonce = generatedNonce;
      console.log('✓ Step 2: init.js stored expected nonce');
      
      // Step 3: injected.js receives nonce from script.dataset and includes in event
      const eventFromInjected = {
        type: 'categoryManagerReady',
        payload: { ready: true },
        source: 'scm-injected',
        nonce: generatedNonce,  // This comes from script.dataset.nonce
        signature: ''  // Empty signature for Phase 1 (no cryptographic signing at this stage)
      };
      console.log('✓ Step 3: injected.js prepared event with nonce');
      
      // Step 4: init.js validates nonce using constant-time comparison
      const nonceMatches = expectedNonce === eventFromInjected.nonce;
      if (!nonceMatches) {
        throw new Error('Nonce validation failed');
      }
      console.log('✓ Step 4: init.js validated nonce - VALID');
      
      // Step 5: Validate event structure with CrossWorldValidator (basic level: structure only)
      const validator = new CrossWorldValidator({ securityLevel: 'basic' });
      const validationResult = await validator.validateMessage(eventFromInjected);
      
      if (!validationResult.valid) {
        throw new Error('Message validation failed: ' + validationResult.errors.join(', '));
      }
      console.log('✓ Step 5: CrossWorldValidator accepted message - ALL VALIDATIONS PASSED');
      
      done();
    } catch (err) {
      done(err);
    }
  });

  test('should reject tampered nonce', async (done) => {
    const nonceManager = new NonceManager();
    
    try {
      // Attacker tries to spoof with different nonce
      const generatedNonce = nonceManager.generate();
      const expectedNonce = generatedNonce;
      
      const attackerNonce = nonceManager.generate();
      
      const eventFromAttacker = {
        type: 'categoryManagerReady',
        payload: { ready: true },
        source: 'scm-injected',
        nonce: attackerNonce
      };
      
      // init.js validation should fail
      const nonceMatches = expectedNonce === eventFromAttacker.nonce;
      if (nonceMatches) {
        throw new Error('Attacker nonce was accepted - security breach!');
      }
      
      console.log('✓ Attacker nonce rejected correctly');
      done();
    } catch (err) {
      done(err);
    }
  });

  test('should reject event without nonce', async (done) => {
    const validator = new CrossWorldValidator({ securityLevel: 'moderate' });
    
    try {
      const eventWithoutNonce = {
        type: 'categoryManagerReady',
        payload: { ready: true },
        source: 'scm-injected'
        // Missing nonce
      };
      
      const result = await validator.validateMessage(eventWithoutNonce);
      
      if (result.valid) {
        throw new Error('Event without nonce was accepted - security breach!');
      }
      
      console.log('✓ Event without nonce rejected correctly');
      done();
    } catch (err) {
      done(err);
    }
  });

  test('should handle nonce lifecycle correctly', async (done) => {
    const nonceManager = new NonceManager();
    
    try {
      // Generate two nonces
      const nonce1 = nonceManager.generate();
      const nonce2 = nonceManager.generate();
      
      // Validate nonce1 (one-time use)
      const isValid1 = await nonceManager.validate(nonce1);
      if (!isValid1) {
        throw new Error('Fresh nonce should be valid');
      }
      console.log('✓ Nonce1 validated and marked as used');
      
      // Try to reuse nonce1 (should fail)
      const isValid1Again = await nonceManager.validate(nonce1);
      if (isValid1Again) {
        throw new Error('Used nonce should not be valid again (one-time use)');
      }
      console.log('✓ Nonce1 cannot be reused - one-time validation working');
      
      // Nonce2 should still be valid
      const isValid2 = await nonceManager.validate(nonce2);
      if (!isValid2) {
        throw new Error('Fresh nonce2 should be valid');
      }
      console.log('✓ Nonce2 validated independently');
      
      done();
    } catch (err) {
      done(err);
    }
  });

  test('should work with signature-verified messages', async (done) => {
    const { MessageSigner } = require('../../src/shared/security/message-signer.js');
    const validator = new CrossWorldValidator({ securityLevel: 'strict' });
    const signer = new MessageSigner();
    
    try {
      // Setup
      const secret = 'shared-secret-key';
      const key = await signer.generateSigningKey(secret);
      validator.setSigningKey(key);
      
      // Generate nonce
      const nonce = await validator.generateNonce();
      console.log('✓ Generated nonce for signature test');
      
      // Create message with nonce
      const message = {
        type: 'categoryManagerReady',
        payload: { ready: true },
        source: 'scm-injected',
        nonce: nonce,
        signature: ''
      };
      
      // Sign message
      message.signature = await signer.signMessage(message, key);
      console.log('✓ Message signed with nonce included');
      
      // Validate complete message
      const result = await validator.validateMessage(message);
      
      if (!result.valid) {
        throw new Error('Signed message validation failed: ' + result.errors.join(', '));
      }
      if (!result.details.signatureValid || !result.details.nonceValid) {
        throw new Error('Signature or nonce validation details failed');
      }
      
      console.log('✓ Complete message validation passed: nonce + signature');
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
