/**
 * SecurityLogger Tests
 * Test suite for security event logging and retrieval
 */

'use strict';

const { SecurityLogger, securityLogger } = require('../../src/shared/security/security-logger.js');

/**
 * Test Suite: Event Logging
 */
describe('SecurityLogger - Event Logging', () => {
  beforeEach(() => {
    securityLogger.clearLogs();
  });

  test('should log security events with structured format', () => {
    const event = securityLogger.logEvent(
      SecurityLogger.CONFIG.EVENT_TYPES.NONCE_GENERATED,
      SecurityLogger.CONFIG.LEVELS.INFO,
      'Nonce generated successfully',
      { nonceLength: 32, ttlMs: 300000 }
    );

    expect(event).toBe(true);
    expect(securityLogger.size()).toBe(1);
  });

  test('should include timestamp in logged events', () => {
    securityLogger.logEvent(
      SecurityLogger.CONFIG.EVENT_TYPES.NONCE_VALIDATED,
      SecurityLogger.CONFIG.LEVELS.INFO,
      'Nonce validated',
      { nonceHash: 'abc123...' }
    );

    const logs = securityLogger.getLogs();
    expect(logs[0].timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  test('should include event type in log entries', () => {
    securityLogger.logEvent(
      SecurityLogger.CONFIG.EVENT_TYPES.MESSAGE_SIGNED,
      SecurityLogger.CONFIG.LEVELS.INFO,
      'Message signed',
      {}
    );

    const logs = securityLogger.getLogs();
    expect(logs[0].eventType).toBe(SecurityLogger.CONFIG.EVENT_TYPES.MESSAGE_SIGNED);
  });

  test('should include log level in entries', () => {
    securityLogger.logEvent(
      SecurityLogger.CONFIG.EVENT_TYPES.NONCE_INVALID,
      SecurityLogger.CONFIG.LEVELS.WARN,
      'Invalid nonce format',
      {}
    );

    const logs = securityLogger.getLogs();
    expect(logs[0].level).toBe(SecurityLogger.CONFIG.LEVELS.WARN);
  });

  test('should include details in log entries', () => {
    const details = { reason: 'expired', age: 350000 };
    securityLogger.logEvent(
      SecurityLogger.CONFIG.EVENT_TYPES.NONCE_EXPIRED,
      SecurityLogger.CONFIG.LEVELS.WARN,
      'Nonce expired',
      details
    );

    const logs = securityLogger.getLogs();
    expect(logs[0].details).toEqual(details);
  });
});

/**
 * Test Suite: Nonce Logging
 */
describe('SecurityLogger - Nonce Logging', () => {
  beforeEach(() => {
    securityLogger.clearLogs();
  });

  test('should log nonce validation success', () => {
    securityLogger.logNonceValidated('abc123...', { context: 'test' });

    const logs = securityLogger.getLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].eventType).toBe(SecurityLogger.CONFIG.EVENT_TYPES.NONCE_VALIDATED);
  });

  test('should log nonce validation failure', () => {
    securityLogger.logNonceInvalid('format_mismatch', { provided: 'invalid' });

    const logs = securityLogger.getLogs();
    expect(logs[0].eventType).toBe(SecurityLogger.CONFIG.EVENT_TYPES.NONCE_INVALID);
    expect(logs[0].level).toBe(SecurityLogger.CONFIG.LEVELS.WARN);
  });

  test('should not log full nonce for security', () => {
    securityLogger.logNonceValidated('secretnonce123456789', { context: 'test' });

    const logs = securityLogger.getLogs();
    const logString = JSON.stringify(logs);

    // Should not contain the full nonce
    expect(logString).not.toMatch(/secretnonce123456789/);
  });
});

/**
 * Test Suite: Message Logging
 */
describe('SecurityLogger - Message Logging', () => {
  beforeEach(() => {
    securityLogger.clearLogs();
  });

  test('should log message signing', () => {
    securityLogger.logMessageSigned('categoryManagerReady', { source: 'injected' });

    const logs = securityLogger.getLogs();
    expect(logs[0].eventType).toBe(SecurityLogger.CONFIG.EVENT_TYPES.MESSAGE_SIGNED);
    expect(logs[0].level).toBe(SecurityLogger.CONFIG.LEVELS.INFO);
  });

  test('should log message validation success', () => {
    securityLogger.logMessageValidated('categoryManagerReady', { signature: 'valid' });

    const logs = securityLogger.getLogs();
    expect(logs[0].eventType).toBe(SecurityLogger.CONFIG.EVENT_TYPES.MESSAGE_VALIDATED);
  });

  test('should log validation failures with error level', () => {
    securityLogger.logValidationFailed(
      'signature_mismatch',
      'Signature does not match message',
      { expected: 'xyz', received: 'abc' }
    );

    const logs = securityLogger.getLogs();
    expect(logs[0].eventType).toBe(SecurityLogger.CONFIG.EVENT_TYPES.VALIDATION_FAILED);
    expect(logs[0].level).toBe(SecurityLogger.CONFIG.LEVELS.ERROR);
  });
});

/**
 * Test Suite: Log Filtering
 */
describe('SecurityLogger - Log Filtering', () => {
  beforeEach(() => {
    securityLogger.clearLogs();
  });

  test('should filter logs by event type', () => {
    securityLogger.logNonceValidated('nonce1', {});
    securityLogger.logNonceInvalid('expired', {});
    securityLogger.logMessageSigned('msg', {});

    const nonceEvents = securityLogger.getLogsByEventType(
      SecurityLogger.CONFIG.EVENT_TYPES.NONCE_VALIDATED
    );

    expect(nonceEvents.length).toBe(1);
    expect(nonceEvents[0].eventType).toBe(SecurityLogger.CONFIG.EVENT_TYPES.NONCE_VALIDATED);
  });

  test('should filter logs by level', () => {
    securityLogger.logEvent(
      SecurityLogger.CONFIG.EVENT_TYPES.NONCE_VALIDATED,
      SecurityLogger.CONFIG.LEVELS.INFO,
      'Success',
      {}
    );
    securityLogger.logEvent(
      SecurityLogger.CONFIG.EVENT_TYPES.NONCE_INVALID,
      SecurityLogger.CONFIG.LEVELS.WARN,
      'Warning',
      {}
    );
    securityLogger.logEvent(
      SecurityLogger.CONFIG.EVENT_TYPES.VALIDATION_FAILED,
      SecurityLogger.CONFIG.LEVELS.ERROR,
      'Error',
      {}
    );

    const warnings = securityLogger.getLogsByLevel(SecurityLogger.CONFIG.LEVELS.WARN);
    expect(warnings.length).toBe(1);
    expect(warnings[0].level).toBe(SecurityLogger.CONFIG.LEVELS.WARN);
  });

  test('should return empty array for non-matching filters', () => {
    securityLogger.logNonceValidated('nonce', {});

    const errors = securityLogger.getLogsByLevel(SecurityLogger.CONFIG.LEVELS.ERROR);
    expect(errors.length).toBe(0);
  });
});

/**
 * Test Suite: Log Storage and Limits
 */
describe('SecurityLogger - Log Storage', () => {
  beforeEach(() => {
    securityLogger.clearLogs();
  });

  test('should respect MAX_LOGS limit', () => {
    const maxLogs = SecurityLogger.CONFIG.MAX_LOGS;

    // Log more than MAX_LOGS
    for (let i = 0; i < maxLogs + 50; i++) {
      securityLogger.logEvent(
        SecurityLogger.CONFIG.EVENT_TYPES.NONCE_VALIDATED,
        SecurityLogger.CONFIG.LEVELS.INFO,
        `Event ${i}`,
        {}
      );
    }

    const logs = securityLogger.getLogs();
    expect(logs.length).toBeLessThanOrEqual(maxLogs);
  });

  test('should keep latest logs when exceeding limit', () => {
    const maxLogs = SecurityLogger.CONFIG.MAX_LOGS;

    // Log with identifiable messages
    for (let i = 0; i < maxLogs + 10; i++) {
      securityLogger.logEvent(
        SecurityLogger.CONFIG.EVENT_TYPES.NONCE_VALIDATED,
        SecurityLogger.CONFIG.LEVELS.INFO,
        `Event ${i}`,
        {}
      );
    }

    const logs = securityLogger.getLogs();
    const lastMessage = logs[logs.length - 1].message;

    // Should contain the last message (Event maxLogs + 9)
    expect(lastMessage).toMatch(/Event \d+/);
  });

  test('should clear all logs', () => {
    securityLogger.logNonceValidated('nonce1', {});
    securityLogger.logNonceValidated('nonce2', {});
    securityLogger.logNonceValidated('nonce3', {});

    expect(securityLogger.getLogs().length).toBe(3);

    securityLogger.clearLogs();

    expect(securityLogger.getLogs().length).toBe(0);
  });
});

/**
 * Test Suite: Export and Statistics
 */
describe('SecurityLogger - Export & Statistics', () => {
  beforeEach(() => {
    securityLogger.clearLogs();
  });

  test('should export logs as structured JSON', () => {
    securityLogger.logNonceValidated('nonce1', {});
    securityLogger.logMessageSigned('msg', {});

    const exported = securityLogger.exportLogs();

    expect(exported.timestamp).toBeDefined();
    expect(exported.logs).toBeDefined();
    expect(Array.isArray(exported.logs)).toBe(true);
    expect(exported.logs.length).toBe(2);
  });

  test('should include export timestamp', () => {
    securityLogger.logNonceValidated('nonce', {});

    const exported = securityLogger.exportLogs();
    expect(exported.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  test('should generate event statistics', () => {
    securityLogger.logNonceValidated('nonce1', {});
    securityLogger.logNonceValidated('nonce2', {});
    securityLogger.logMessageSigned('msg', {});
    securityLogger.logValidationFailed('error', 'Test error', {});

    const stats = securityLogger.getStatistics();

    expect(stats).toBeDefined();
    expect(stats.byEventType).toBeDefined();
    expect(stats.byLevel).toBeDefined();
    expect(stats.total).toBe(4);
  });

  test('should count events by type in statistics', () => {
    securityLogger.logNonceValidated('nonce1', {});
    securityLogger.logNonceValidated('nonce2', {});
    securityLogger.logMessageSigned('msg', {});

    const stats = securityLogger.getStatistics();

    expect(stats.byEventType[SecurityLogger.CONFIG.EVENT_TYPES.NONCE_VALIDATED]).toBe(2);
    expect(stats.byEventType[SecurityLogger.CONFIG.EVENT_TYPES.MESSAGE_SIGNED]).toBe(1);
  });

  test('should count events by level in statistics', () => {
    securityLogger.logEvent(
      SecurityLogger.CONFIG.EVENT_TYPES.NONCE_VALIDATED,
      SecurityLogger.CONFIG.LEVELS.INFO,
      'Info',
      {}
    );
    securityLogger.logEvent(
      SecurityLogger.CONFIG.EVENT_TYPES.NONCE_INVALID,
      SecurityLogger.CONFIG.LEVELS.WARN,
      'Warn',
      {}
    );
    securityLogger.logEvent(
      SecurityLogger.CONFIG.EVENT_TYPES.VALIDATION_FAILED,
      SecurityLogger.CONFIG.LEVELS.ERROR,
      'Error',
      {}
    );

    const stats = securityLogger.getStatistics();

    expect(stats.byLevel.INFO).toBe(1);
    expect(stats.byLevel.WARN).toBe(1);
    expect(stats.byLevel.ERROR).toBe(1);
  });
});

/**
 * Test Suite: Debug Mode
 */
describe('SecurityLogger - Debug Mode', () => {
  beforeEach(() => {
    securityLogger.clearLogs();
    securityLogger.setDebugMode(false);
  });

  test('should toggle debug mode', () => {
    expect(securityLogger.debugMode).toBe(false);

    securityLogger.setDebugMode(true);
    expect(securityLogger.debugMode).toBe(true);

    securityLogger.setDebugMode(false);
    expect(securityLogger.debugMode).toBe(false);
  });

  test('should log debug events in debug mode', () => {
    securityLogger.setDebugMode(true);

    securityLogger.logEvent(
      SecurityLogger.CONFIG.EVENT_TYPES.NONCE_GENERATED,
      SecurityLogger.CONFIG.LEVELS.DEBUG,
      'Debug info',
      {}
    );

    const logs = securityLogger.getLogs();
    expect(logs.length).toBe(1);
  });
});

/**
 * Test Suite: Size Method
 */
describe('SecurityLogger - Size', () => {
  test('should return log count', () => {
    securityLogger.clearLogs();
    expect(securityLogger.size()).toBe(0);

    securityLogger.logNonceValidated('nonce1', {});
    expect(securityLogger.size()).toBe(1);

    securityLogger.logMessageSigned('msg', {});
    expect(securityLogger.size()).toBe(2);
  });
});

// Export for test framework
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SecurityLogger, securityLogger };
}
