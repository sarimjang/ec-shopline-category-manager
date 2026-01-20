/**
 * Logger - Unified logging with optional storage of logs for debugging
 */

const ShoplineLogger = (function() {
  'use strict';

  const PREFIX = '[Shopline-Manager]';
  const MAX_LOGS = 100; // Keep last 100 logs in memory
  const logs = [];

  /**
   * Format log message
   */
  function formatMessage(level, message, data) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `${PREFIX} [${timestamp}] [${level}] ${message}`;
    return { timestamp, level, message, data, formatted: formattedMessage };
  }

  /**
   * Store log in memory
   */
  function storeLogs(logEntry) {
    logs.push(logEntry);
    // Keep only last MAX_LOGS entries
    if (logs.length > MAX_LOGS) {
      logs.shift();
    }
  }

  /**
   * Log level: INFO
   */
  function log(message, data) {
    const entry = formatMessage('INFO', message, data);
    storeLogs(entry);
    console.log(entry.formatted, data || '');
  }

  /**
   * Log level: WARN
   */
  function warn(message, data) {
    const entry = formatMessage('WARN', message, data);
    storeLogs(entry);
    console.warn(entry.formatted, data || '');
  }

  /**
   * Log level: ERROR
   */
  function error(message, err) {
    const entry = formatMessage('ERROR', message, err);
    storeLogs(entry);
    console.error(entry.formatted, err || '');
  }

  /**
   * Log level: DEBUG
   */
  function debug(message, data) {
    const entry = formatMessage('DEBUG', message, data);
    storeLogs(entry);
    if (process.env.DEBUG) {
      console.debug(entry.formatted, data || '');
    }
  }

  /**
   * Get all stored logs
   */
  function getLogs() {
    return logs.slice(); // Return copy
  }

  /**
   * Clear stored logs
   */
  function clearLogs() {
    logs.length = 0;
  }

  /**
   * Export logs as JSON
   */
  function exportLogs() {
    return {
      timestamp: new Date().toISOString(),
      logs: logs
    };
  }

  return {
    log,
    warn,
    error,
    debug,
    getLogs,
    clearLogs,
    exportLogs
  };
})();

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.ShoplineLogger = ShoplineLogger;
}
