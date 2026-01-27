/**
 * CSV Export Utility - Converts data to CSV format
 * Handles special characters, escaping, and formatting
 */

const ShoplineCsvExport = (function() {
  'use strict';

  /**
   * Escape CSV field values
   * Wraps fields in quotes and escapes internal quotes
   * @param {*} field - Field value to escape
   * @returns {string} Escaped field
   */
  function escapeField(field) {
    if (field === null || field === undefined) {
      return '';
    }

    const str = String(field);

    // Check if field needs quoting
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }

    return str;
  }

  /**
   * Convert array of objects to CSV format
   * @param {Array} data - Array of objects to convert
   * @param {Array} headers - Optional array of header names
   * @returns {string} CSV formatted string
   */
  function arrayToCsv(data, headers = null) {
    if (!Array.isArray(data) || data.length === 0) {
      return '';
    }

    // Determine headers from first object if not provided
    if (!headers) {
      const firstObj = data[0];
      if (typeof firstObj !== 'object') {
        // Handle array of primitives
        return data.map(item => escapeField(item)).join('\n');
      }
      headers = Object.keys(firstObj);
    }

    // Build header row
    const headerRow = headers.map(h => escapeField(h)).join(',');

    // Build data rows
    const dataRows = data.map(row => {
      return headers.map(header => {
        const value = row[header];
        return escapeField(value);
      }).join(',');
    });

    return [headerRow, ...dataRows].join('\n');
  }

  /**
   * Create multiple CSV sheets as a single string
   * Format: Sheet Name\n...CSV data\n\n
   * @param {Object} sheets - Object with sheet names as keys and data arrays as values
   * @returns {string} Combined CSV data
   */
  function createCsvSheets(sheets) {
    const parts = [];

    for (const [sheetName, data] of Object.entries(sheets)) {
      parts.push(`# ${sheetName}`);
      parts.push(arrayToCsv(data));
      parts.push('');
    }

    return parts.join('\n');
  }

  /**
   * Create moves CSV format
   * Columns: Timestamp, Category ID, Category Name, Time Saved (seconds)
   * @param {Array} moveHistory - Array of move records
   * @returns {string} CSV formatted moves data
   */
  function createMovesCsv(moveHistory) {
    if (!Array.isArray(moveHistory)) {
      return '';
    }

    const headers = ['Timestamp', 'Category ID', 'Category Name', 'Time Saved (seconds)'];
    const data = moveHistory.map(move => ({
      'Timestamp': move.timestamp || '',
      'Category ID': move.categoryId || '',
      'Category Name': move.categoryName || '',
      'Time Saved (seconds)': move.timeSaved || 0
    }));

    return arrayToCsv(data, headers);
  }

  /**
   * Create searches CSV format
   * Columns: Query, Result Count, Timestamp
   * @param {Array} searchHistory - Array of search records
   * @returns {string} CSV formatted searches data
   */
  function createSearchesCsv(searchHistory) {
    if (!Array.isArray(searchHistory)) {
      return '';
    }

    const headers = ['Query', 'Timestamp'];
    const data = searchHistory.map(search => ({
      'Query': search,
      'Timestamp': new Date().toISOString()
    }));

    return arrayToCsv(data, headers);
  }

  /**
   * Create errors CSV format
   * Columns: Timestamp, Type, Message
   * @param {Array} errorLog - Array of error records
   * @returns {string} CSV formatted errors data
   */
  function createErrorsCsv(errorLog) {
    if (!Array.isArray(errorLog)) {
      return '';
    }

    const headers = ['Timestamp', 'Type', 'Message'];
    const data = errorLog.map(error => ({
      'Timestamp': error.timestamp || '',
      'Type': error.type || 'unknown',
      'Message': error.message || ''
    }));

    return arrayToCsv(data, headers);
  }

  /**
   * Create statistics CSV format
   * Single row with overall statistics
   * @param {Object} stats - Statistics object
   * @returns {string} CSV formatted statistics
   */
  function createStatsCsv(stats) {
    const data = [{
      'Total Moves': stats.totalMoves || 0,
      'Total Time Saved (seconds)': stats.totalTimeSaved || 0,
      'Average Time Per Move (seconds)': stats.totalMoves > 0
        ? Math.floor(stats.totalTimeSaved / stats.totalMoves)
        : 0,
      'Last Reset': stats.lastReset || ''
    }];

    return arrayToCsv(data);
  }

  return {
    escapeField,
    arrayToCsv,
    createCsvSheets,
    createMovesCsv,
    createSearchesCsv,
    createErrorsCsv,
    createStatsCsv
  };
})();

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.ShoplineCsvExport = ShoplineCsvExport;
}
