/**
 * CrossWorldValidator - Unified message validation for cross-world communication
 * Combines nonce validation, message structure validation, and signature verification
 * into a single secure validation pipeline
 */

const { NonceManager } = require('./nonce-manager.js');
const { MessageValidator } = require('./message-validator.js');
const { MessageSigner } = require('./message-signer.js');
const { SecurityLogger } = require('./security-logger.js');

class CrossWorldValidator {
  /**
   * Configuration for cross-world validation
   * @type {Object}
   */
  static CONFIG = {
    // Maximum allowed time difference between message creation and validation (ms)
    MESSAGE_FRESHNESS_WINDOW: 60000, // 60 seconds
    
    // Whether to require signature verification
    REQUIRE_SIGNATURE: true,
    
    // Whether to require nonce validation
    REQUIRE_NONCE: true,
    
    // Valid message sources for cross-world communication
    VALID_SOURCES: ['scm-injected', 'scm-content-script'],
    
    // Security levels
    SECURITY_LEVELS: {
      STRICT: 'strict',    // All validations required
      MODERATE: 'moderate', // Structure + nonce required, signature optional
      BASIC: 'basic'       // Structure validation only
    }
  };

  /**
   * Initialize CrossWorldValidator with security modules
   * @param {Object} options - Configuration options
   * @param {string} options.securityLevel - Security level (strict, moderate, basic)
   * @param {CryptoKey} options.signingKey - Signing key for signature verification
   * @param {NonceManager} options.nonceManager - Nonce manager instance
   * @param {MessageValidator} options.messageValidator - Message validator instance
   * @param {MessageSigner} options.messageSigner - Message signer instance
   * @param {SecurityLogger} options.securityLogger - Security logger instance
   */
  constructor(options = {}) {
    /**
     * Security level for validation
     * @type {string}
     */
    this.securityLevel = options.securityLevel || CrossWorldValidator.CONFIG.SECURITY_LEVELS.STRICT;

    /**
     * NonceManager instance for nonce validation
     * @type {NonceManager}
     */
    this.nonceManager = options.nonceManager || new NonceManager();

    /**
     * MessageValidator instance for structure validation
     * @type {MessageValidator}
     */
    this.messageValidator = options.messageValidator || new MessageValidator();

    /**
     * MessageSigner instance for signature verification
     * @type {MessageSigner}
     */
    this.messageSigner = options.messageSigner || new MessageSigner();

    /**
     * SecurityLogger instance for event logging
     * @type {SecurityLogger}
     */
    this.securityLogger = options.securityLogger || new SecurityLogger();

    /**
     * Signing key for signature verification
     * @type {CryptoKey|undefined}
     */
    this.signingKey = options.signingKey;

    // Start nonce cleanup if not already started
    if (this.nonceManager) {
      this.nonceManager.startCleanup();
    }
  }

  /**
   * Set the signing key for signature verification
   * @param {CryptoKey} key - The signing key
   * @returns {boolean} True if key was set successfully
   */
  setSigningKey(key) {
    if (!key || typeof key !== 'object') {
      return false;
    }
    this.signingKey = key;
    this.messageSigner.setSigningKey(key);
    return true;
  }

  /**
   * Validate a complete message from cross-world communication
   * Performs structure validation, nonce validation, and signature verification
   * @param {Object} message - Message to validate
   * @returns {Promise<Object>} Validation result with structure: { valid, errors, details }
   */
  async validateMessage(message) {
    const validationResult = {
      valid: false,
      errors: [],
      details: {
        structureValid: false,
        nonceValid: false,
        signatureValid: false,
        sourceValid: false
      }
    };

    try {
      // Step 1: Validate message structure
      const structureValidation = this.messageValidator.validateMessageStructure(message);
      validationResult.details.structureValid = structureValidation.valid;

      if (!structureValidation.valid) {
        validationResult.errors.push(...structureValidation.errors);
        this.securityLogger.logValidationFailed(
          'structure-validation',
          'Message structure validation failed',
          { errors: structureValidation.errors }
        );
        return validationResult;
      }

      // Step 2: Validate source
      const sourceValidation = this.messageValidator.validateSource(message.source);
      validationResult.details.sourceValid = sourceValidation.valid;

      if (!sourceValidation.valid) {
        validationResult.errors.push(sourceValidation.error || 'Invalid message source');
        this.securityLogger.logValidationFailed(
          'source-validation',
          sourceValidation.error || 'Invalid message source',
          { source: message.source }
        );
        return validationResult;
      }

      // Step 3: Validate nonce (if required)
      if (this.securityLevel !== CrossWorldValidator.CONFIG.SECURITY_LEVELS.BASIC) {
        const nonceValidation = this.messageValidator.validateNonce(message.nonce);

        if (!nonceValidation.valid) {
          validationResult.errors.push(nonceValidation.error || 'Invalid nonce format');
          this.securityLogger.logValidationFailed(
            'nonce-format-validation',
            nonceValidation.error || 'Invalid nonce format'
          );
          return validationResult;
        }

        // Validate nonce against registered nonces
        const nonceExists = await this.nonceManager.validate(message.nonce);
        validationResult.details.nonceValid = nonceExists;

        if (!nonceExists) {
          validationResult.errors.push('Nonce validation failed: unknown or expired nonce');
          this.securityLogger.logNonceInvalid(
            'unknown or expired',
            { source: message.source }
          );
          return validationResult;
        }

        this.securityLogger.logNonceValidated(
          message.nonce,
          { source: message.source }
        );
      }

      // Step 4: Validate signature (if required and key is available)
      if (this.securityLevel === CrossWorldValidator.CONFIG.SECURITY_LEVELS.STRICT ||
          (this.securityLevel === CrossWorldValidator.CONFIG.SECURITY_LEVELS.MODERATE &&
           this.signingKey)) {

        const signatureValidation = this.messageValidator.validateSignature(message.signature);

        if (!signatureValidation.valid) {
          validationResult.errors.push(signatureValidation.error || 'Invalid signature format');
          this.securityLogger.logValidationFailed(
            'signature-format-validation',
            signatureValidation.error || 'Invalid signature format'
          );
          return validationResult;
        }

        if (!this.signingKey) {
          validationResult.errors.push('Signing key not available for signature verification');
          this.securityLogger.logValidationFailed(
            'signature-verification',
            'No signing key available'
          );
          return validationResult;
        }

        const signatureValid = await this.messageSigner.verifySignature(
          message,
          message.signature,
          this.signingKey
        );
        validationResult.details.signatureValid = signatureValid;

        if (!signatureValid) {
          validationResult.errors.push('Signature verification failed');
          this.securityLogger.logValidationFailed(
            'signature-verification',
            'Invalid or tampered signature',
            { messageType: message.type }
          );
          return validationResult;
        }

        this.securityLogger.logMessageValidated(
          message.type,
          { source: message.source }
        );
      }

      // All validations passed
      validationResult.valid = true;
      this.securityLogger.logEvent(
        'MESSAGE_VALIDATED',
        'INFO',
        `Message validated: ${message.type}`,
        {
          messageType: message.type,
          source: message.source,
          securityLevel: this.securityLevel
        }
      );

      return validationResult;

    } catch (err) {
      validationResult.errors.push(`Validation error: ${err.message}`);
      this.securityLogger.logValidationFailed(
        'validation-execution',
        err.message,
        { stack: err.stack }
      );
      return validationResult;
    }
  }

  /**
   * Generate a new nonce for injecting into scripts
   * @returns {Promise<string>} 32-character hex nonce
   */
  async generateNonce() {
    try {
      const nonce = this.nonceManager.generate();
      this.securityLogger.logEvent(
        'NONCE_GENERATED',
        'DEBUG',
        `Generated nonce (${nonce.length} chars, hex format)`,
        { nonceLength: nonce.length, format: 'hex' }
      );
      return nonce;
    } catch (err) {
      this.securityLogger.logEvent(
        'NONCE_GENERATION_FAILED',
        'ERROR',
        `Nonce generation failed: ${err.message}`,
        { error: err.message }
      );
      throw err;
    }
  }

  /**
   * Get validation statistics
   * @returns {Object} Statistics about validation operations
   */
  getStatistics() {
    return {
      securityLevel: this.securityLevel,
      nonceManager: {
        activeNonces: this.nonceManager.nonces.size
      },
      logger: this.securityLogger.getStatistics()
    };
  }

  /**
   * Get security logs
   * @param {string} type - Log type to filter by
   * @returns {Array} Logs matching the type
   */
  getLogs(type) {
    if (type) {
      return this.securityLogger.getLogsByEventType(type);
    }
    return this.securityLogger.getLogs();
  }

  /**
   * Clear security logs
   */
  clearLogs() {
    this.securityLogger.clearLogs();
  }

  /**
   * Get validator configuration
   * @returns {Object} Configuration details
   */
  getConfig() {
    return {
      securityLevel: this.securityLevel,
      messageValidationConfig: this.messageValidator.getConfig?.() || {},
      nonceConfig: NonceManager.CONFIG,
      messageSignerConfig: MessageSigner.CONFIG
    };
  }
}

// Create singleton instance
const crossWorldValidator = new CrossWorldValidator();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CrossWorldValidator, crossWorldValidator };
}

// Make available globally for extension context
if (typeof window !== 'undefined') {
  window.ShoplineCrossWorldValidator = { CrossWorldValidator, crossWorldValidator };
}
