/**
 * SecurityLogger - Security event logging with structured format
 * Logs nonce validation, message signing/validation, and security events
 */

class SecurityLogger {
  /**
   * Configuration for security logging
   * @type {Object}
   */
  static CONFIG = {
    // Maximum logs to keep in memory
    MAX_LOGS: 200,
    // Log levels
    LEVELS: {
      INFO: 'INFO',
      WARN: 'WARN',
      ERROR: 'ERROR',
      DEBUG: 'DEBUG',
    },
    // Security event types
    EVENT_TYPES: {
      NONCE_GENERATED: 'NONCE_GENERATED',
      NONCE_VALIDATED: 'NONCE_VALIDATED',
      NONCE_INVALID: 'NONCE_INVALID',
      NONCE_EXPIRED: 'NONCE_EXPIRED',
      MESSAGE_SIGNED: 'MESSAGE_SIGNED',
      MESSAGE_VALIDATED: 'MESSAGE_VALIDATED',
      VALIDATION_FAILED: 'VALIDATION_FAILED',
      SIGNATURE_MISMATCH: 'SIGNATURE_MISMATCH',
    },
  };

  /**
   * Initialize SecurityLogger
   */
  constructor() {
    /**
     * Array of security event logs
     * @type {Array}
     */
    this.logs = [];

    /**
     * Enable/disable debug logging
     * @type {boolean}
     */
    this.debugMode = false;
  }

  /**
   * Log a security event
   * @param {string} eventType - Type of security event
   * @param {string} level - Log level (INFO, WARN, ERROR, DEBUG)
   * @param {string} message - Event message
   * @param {Object} details - Additional details (context, values, etc.)
   * @returns {boolean} True if logged successfully
   */
  logEvent(eventType, level, message, details = {}) {
    // Validate input
    if (!eventType || !level || !message) {
      return false;
    }

    // Create structured log entry
    const now = new Date();
    const logEntry = {
      timestamp: now.toISOString(),
      eventType: eventType,
      level: level,
      message: message,
      details: details,
      formatted: `[${now.toISOString()}] [${level}] [${eventType}] ${message}`,
    };

    // Store in memory (respect MAX_LOGS limit)
    this.logs.push(logEntry);
    if (this.logs.length > SecurityLogger.CONFIG.MAX_LOGS) {
      this.logs.shift();
    }

    // Output to console based on level
    const consoleMethod = this._getConsoleMethod(level);
    if (consoleMethod) {
      consoleMethod(logEntry.formatted, details);
    }

    return true;
  }

  /**
   * Get appropriate console method for log level
   * @param {string} level - Log level
   * @returns {Function|null} Console method or null
   * @private
   */
  _getConsoleMethod(level) {
    switch (level) {
      case SecurityLogger.CONFIG.LEVELS.ERROR:
        return console.error;
      case SecurityLogger.CONFIG.LEVELS.WARN:
        return console.warn;
      case SecurityLogger.CONFIG.LEVELS.DEBUG:
        return this.debugMode ? console.debug : null;
      case SecurityLogger.CONFIG.LEVELS.INFO:
      default:
        return console.log;
    }
  }

  /**
   * Log successful nonce validation
   * @param {string} nonce - The validated nonce
   * @param {Object} context - Additional context
   * @returns {boolean} True if logged successfully
   */
  logNonceValidated(nonce, context = {}) {
    // Extract nonce hash (don't log full nonce for security)
    const nonceHash = nonce ? nonce.substring(0, 8) + '...' : 'unknown';

    return this.logEvent(
      SecurityLogger.CONFIG.EVENT_TYPES.NONCE_VALIDATED,
      SecurityLogger.CONFIG.LEVELS.INFO,
      `Nonce validated (${nonceHash})`,
      { nonceHash, ...context }
    );
  }

  /**
   * Log failed nonce validation
   * @param {string} reason - Reason for failure (expired, invalid, format)
   * @param {Object} context - Additional context
   * @returns {boolean} True if logged successfully
   */
  logNonceInvalid(reason, context = {}) {
    return this.logEvent(
      SecurityLogger.CONFIG.EVENT_TYPES.NONCE_INVALID,
      SecurityLogger.CONFIG.LEVELS.WARN,
      `Nonce invalid: ${reason}`,
      { reason, ...context }
    );
  }

  /**
   * Log message signing
   * @param {string} messageType - Type of message being signed
   * @param {Object} context - Additional context
   * @returns {boolean} True if logged successfully
   */
  logMessageSigned(messageType, context = {}) {
    return this.logEvent(
      SecurityLogger.CONFIG.EVENT_TYPES.MESSAGE_SIGNED,
      SecurityLogger.CONFIG.LEVELS.INFO,
      `Message signed: ${messageType}`,
      { messageType, ...context }
    );
  }

  /**
   * Log successful message validation
   * @param {string} messageType - Type of message validated
   * @param {Object} context - Additional context
   * @returns {boolean} True if logged successfully
   */
  logMessageValidated(messageType, context = {}) {
    return this.logEvent(
      SecurityLogger.CONFIG.EVENT_TYPES.MESSAGE_VALIDATED,
      SecurityLogger.CONFIG.LEVELS.INFO,
      `Message validated: ${messageType}`,
      { messageType, ...context }
    );
  }

  /**
   * Log validation failure
   * @param {string} failureType - Type of validation failure
   * @param {string} reason - Detailed reason
   * @param {Object} context - Additional context
   * @returns {boolean} True if logged successfully
   */
  logValidationFailed(failureType, reason, context = {}) {
    return this.logEvent(
      SecurityLogger.CONFIG.EVENT_TYPES.VALIDATION_FAILED,
      SecurityLogger.CONFIG.LEVELS.ERROR,
      `Validation failed: ${failureType} - ${reason}`,
      { failureType, reason, ...context }
    );
  }

  /**
   * Get all security logs
   * @returns {Array} Copy of security logs
   */
  getLogs() {
    return this.logs.slice();
  }

  /**
   * Get logs filtered by event type
   * @param {string} eventType - Event type to filter by
   * @returns {Array} Filtered logs
   */
  getLogsByEventType(eventType) {
    return this.logs.filter((log) => log.eventType === eventType);
  }

  /**
   * Get logs filtered by level
   * @param {string} level - Log level to filter by
   * @returns {Array} Filtered logs
   */
  getLogsByLevel(level) {
    return this.logs.filter((log) => log.level === level);
  }

  /**
   * Clear all security logs
   */
  clearLogs() {
    this.logs.length = 0;
  }

  /**
   * Get number of logged events
   * @returns {number}
   */
  size() {
    return this.logs.length;
  }

  /**
   * Export logs as JSON
   * @returns {Object} Structured log export with timestamp
   */
  exportLogs() {
    const stats = this.getStatistics();

    return {
      timestamp: new Date().toISOString(),
      logs: this.logs.slice(),
      statistics: stats,
      summary: {
        totalEvents: this.logs.length,
        oldestEvent: this.logs.length > 0 ? this.logs[0].timestamp : null,
        newestEvent: this.logs.length > 0 ? this.logs[this.logs.length - 1].timestamp : null,
      },
    };
  }

  /**
   * Enable/disable debug mode
   * @param {boolean} enabled - Whether to enable debug mode
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }

  /**
   * Get statistics about logged events
   * @returns {Object} Event statistics
   */
  getStatistics() {
    const byEventType = {};
    const byLevel = {};
    let firstTimestamp = null;
    let lastTimestamp = null;

    // Count by event type and level
    this.logs.forEach((log) => {
      // Count by type
      if (!byEventType[log.eventType]) {
        byEventType[log.eventType] = 0;
      }
      byEventType[log.eventType]++;

      // Count by level
      if (!byLevel[log.level]) {
        byLevel[log.level] = 0;
      }
      byLevel[log.level]++;

      // Track time range
      if (!firstTimestamp) {
        firstTimestamp = log.timestamp;
      }
      lastTimestamp = log.timestamp;
    });

    return {
      total: this.logs.length,
      byEventType: byEventType,
      byLevel: byLevel,
      timeRange: {
        first: firstTimestamp,
        last: lastTimestamp,
      },
    };
  }
}

// Create singleton instance
const securityLogger = new SecurityLogger();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SecurityLogger, securityLogger };
}

// Make available globally for extension context
if (typeof window !== 'undefined') {
  window.ShoplineSecurityLogger = { SecurityLogger, securityLogger };
}
