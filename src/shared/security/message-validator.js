/**
 * MessageValidator - Validate message structure and security properties
 * Validates message format, nonce, signature, and source origin
 */

class MessageValidator {
  /**
   * Configuration for message validation
   * @type {Object}
   */
  static CONFIG = {
    // Valid message sources (content script identifier prefix)
    VALID_SOURCE_PREFIX: 'scm-',
    // Valid message types
    MESSAGE_TYPES: {
      CATEGORY_MANAGER_READY: 'categoryManagerReady',
      CATEGORY_MOVED: 'categoryMoved',
      SYNC_CATEGORIES: 'syncCategories',
    },
    // Validation error codes
    ERROR_CODES: {
      MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
      INVALID_SOURCE: 'INVALID_SOURCE',
      MISSING_NONCE: 'MISSING_NONCE',
      INVALID_NONCE_FORMAT: 'INVALID_NONCE_FORMAT',
      MISSING_SIGNATURE: 'MISSING_SIGNATURE',
      INVALID_MESSAGE_TYPE: 'INVALID_MESSAGE_TYPE',
      EMPTY_PAYLOAD: 'EMPTY_PAYLOAD',
    },
  };

  /**
   * Initialize MessageValidator
   */
  constructor() {
    // No instance state needed
  }

  /**
   * Validate message structure and required fields
   * @param {Object} message - Message to validate
   * @returns {Object} Validation result { valid: boolean, errors: Array }
   */
  validateMessageStructure(message) {
    const errors = [];

    // Check message is object and not null
    if (!message || typeof message !== 'object' || Array.isArray(message)) {
      return {
        valid: false,
        errors: ['Message must be a non-null object']
      };
    }

    // Validate required fields exist
    const requiredFields = ['type', 'payload', 'source', 'nonce', 'signature'];
    for (const field of requiredFields) {
      if (!(field in message)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Check payload is not empty (if it exists)
    if ('payload' in message) {
      if (!message.payload || typeof message.payload !== 'object' || Array.isArray(message.payload)) {
        errors.push('Payload must be a non-empty object');
      } else if (Object.keys(message.payload).length === 0) {
        errors.push('Payload cannot be empty');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Validate message source
   * @param {string} source - Source to validate
   * @returns {Object} Validation result { valid: boolean, error: string|null }
   */
  validateSource(source) {
    if (!source || typeof source !== 'string') {
      return {
        valid: false,
        error: 'Source must be a non-empty string'
      };
    }

    if (!source.startsWith(MessageValidator.CONFIG.VALID_SOURCE_PREFIX)) {
      return {
        valid: false,
        error: `Source must start with "${MessageValidator.CONFIG.VALID_SOURCE_PREFIX}"`
      };
    }

    return {
      valid: true,
      error: null
    };
  }

  /**
   * Validate nonce presence and format
   * @param {string} nonce - Nonce to validate
   * @returns {Object} Validation result { valid: boolean, error: string|null }
   */
  validateNonce(nonce) {
    if (!nonce) {
      return {
        valid: false,
        error: 'Nonce is required'
      };
    }

    if (typeof nonce !== 'string') {
      return {
        valid: false,
        error: 'Nonce must be a string'
      };
    }

    // Validate format: 32 hex characters
    if (!/^[0-9a-f]{32}$/i.test(nonce)) {
      return {
        valid: false,
        error: 'Nonce must be 32 hexadecimal characters'
      };
    }

    return {
      valid: true,
      error: null
    };
  }

  /**
   * Validate signature presence
   * @param {string} signature - Signature to validate
   * @returns {Object} Validation result { valid: boolean, error: string|null }
   */
  validateSignature(signature) {
    if (!signature) {
      return {
        valid: false,
        error: 'Signature is required'
      };
    }

    if (typeof signature !== 'string') {
      return {
        valid: false,
        error: 'Signature must be a string'
      };
    }

    if (signature.trim().length === 0) {
      return {
        valid: false,
        error: 'Signature cannot be empty'
      };
    }

    return {
      valid: true,
      error: null
    };
  }

  /**
   * Validate message type
   * @param {string} type - Message type to validate
   * @returns {Object} Validation result { valid: boolean, error: string|null }
   */
  validateMessageType(type) {
    if (!type) {
      return {
        valid: false,
        error: 'Message type is required'
      };
    }

    if (typeof type !== 'string') {
      return {
        valid: false,
        error: 'Message type must be a string'
      };
    }

    // Check if type is in known MESSAGE_TYPES
    const validTypes = Object.values(MessageValidator.CONFIG.MESSAGE_TYPES);
    if (!validTypes.includes(type)) {
      return {
        valid: false,
        error: `Unknown message type: ${type}`
      };
    }

    return {
      valid: true,
      error: null
    };
  }

  /**
   * Comprehensive message validation
   * Validates all aspects of message in one call
   * @param {Object} message - Complete message to validate
   * @returns {Object} Validation result with all checks
   */
  validate(message) {
    const allErrors = [];

    // 1. Validate message structure
    const structureResult = this.validateMessageStructure(message);
    if (!structureResult.valid) {
      return {
        valid: false,
        errors: structureResult.errors
      };
    }

    // 2. If structure valid, validate individual components
    if (message.source) {
      const sourceResult = this.validateSource(message.source);
      if (!sourceResult.valid) {
        allErrors.push(sourceResult.error);
      }
    }

    if (message.nonce) {
      const nonceResult = this.validateNonce(message.nonce);
      if (!nonceResult.valid) {
        allErrors.push(nonceResult.error);
      }
    }

    if (message.signature) {
      const signatureResult = this.validateSignature(message.signature);
      if (!signatureResult.valid) {
        allErrors.push(signatureResult.error);
      }
    }

    if (message.type) {
      const typeResult = this.validateMessageType(message.type);
      if (!typeResult.valid) {
        allErrors.push(typeResult.error);
      }
    }

    // 3. Return complete validation result
    return {
      valid: allErrors.length === 0,
      errors: allErrors
    };
  }

  /**
   * Get human-readable error message for validation error
   * @param {string} errorCode - Error code
   * @param {Object} context - Additional context
   * @returns {string} Human-readable error message
   */
  getErrorMessage(errorCode, context = {}) {
    const messages = {
      [MessageValidator.CONFIG.ERROR_CODES.MISSING_REQUIRED_FIELD]:
        `Missing required field: ${context.field || 'unknown'}`,

      [MessageValidator.CONFIG.ERROR_CODES.INVALID_SOURCE]:
        `Invalid message source: ${context.source || 'unknown'}. Source must start with 'scm-'`,

      [MessageValidator.CONFIG.ERROR_CODES.MISSING_NONCE]:
        'Nonce is required for message validation',

      [MessageValidator.CONFIG.ERROR_CODES.INVALID_NONCE_FORMAT]:
        `Invalid nonce format: ${context.provided || 'unknown'}. Nonce must be 32 hexadecimal characters`,

      [MessageValidator.CONFIG.ERROR_CODES.MISSING_SIGNATURE]:
        'Signature is required for message validation',

      [MessageValidator.CONFIG.ERROR_CODES.INVALID_MESSAGE_TYPE]:
        `Invalid message type: ${context.type || 'unknown'}`,

      [MessageValidator.CONFIG.ERROR_CODES.EMPTY_PAYLOAD]:
        'Message payload cannot be empty'
    };

    return messages[errorCode] || `Validation error: ${errorCode}`;
  }
}

// Create singleton instance
const messageValidator = new MessageValidator();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MessageValidator, messageValidator };
}

// Make available globally for extension context
if (typeof window !== 'undefined') {
  window.ShoplineMessageValidator = { MessageValidator, messageValidator };
}
