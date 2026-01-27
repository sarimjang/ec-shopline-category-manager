/**
 * Import Validator Tests
 * Test cases for validation functionality
 */

'use strict';

const testCases = {
  validJsonComplete: {
    name: 'Valid JSON with all required fields',
    expectedValid: true,
    expectedErrorCount: 0
  },
  invalidJson: {
    name: 'Invalid JSON format',
    expectedValid: false,
    expectedErrorCount: 1
  },
  missingFields: {
    name: 'Missing required fields',
    expectedValid: false,
    expectedErrorCount: 1
  },
  typeMismatch: {
    name: 'Type mismatch',
    expectedValid: false,
    expectedErrorCount: 1
  },
  invalidTimestamp: {
    name: 'Invalid timestamp format',
    expectedValid: true,
    expectedWarningCount: 1
  },
  exceedBoundaries: {
    name: 'Move history exceeds max 500 records',
    expectedValid: true,
    expectedWarningCount: 1
  },
  emptyInput: {
    name: 'Empty input string',
    expectedValid: false,
    expectedErrorCount: 1
  },
  nonObjectRoot: {
    name: 'JSON root is array',
    expectedValid: false,
    expectedErrorCount: 1
  },
  minimalValid: {
    name: 'Minimal valid data',
    expectedValid: true,
    expectedErrorCount: 0
  },
  fullData: {
    name: 'Full data with all fields',
    expectedValid: true,
    expectedErrorCount: 0
  }
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testCases };
}
