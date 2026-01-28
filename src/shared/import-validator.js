/**
 * Import Validator - Comprehensive JSON validation and schema checking
 * 驗證匯入資料的完整性、格式正確性和資料型別
 */

'use strict';

const ShoplineImportValidator = (function() {
  const logger = window.ShoplineLogger || console;

  const SEVERITY = {
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR'
  };

  const SUPPORTED_SCHEMA_VERSIONS = [1];
  const ISO_8601_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?$/;

  /**
   * Validate JSON syntax and basic structure
   * @param {string} jsonString - JSON string to parse
   * @returns {Object} Validation result
   * @returns {Object.isValid} boolean - Whether JSON is valid
   * @returns {Object.data} object | null - Parsed data (only if valid)
   * @returns {Object.error} string | null - Error message if invalid
   * @constraints
   *   - Must be string type
   *   - Must not be empty
   *   - Must be parseable JSON
   *   - Root must be object, not array or primitive
   * @example
   * const result = validateJsonFormat('{"key":"value"}');
   * if (result.isValid) { processData(result.data); }
   */
  function validateJsonFormat(jsonString) {
    try {
      if (typeof jsonString !== 'string') {
        return { isValid: false, data: null, error: 'Input is not a string' };
      }
      const trimmed = jsonString.trim();
      if (!trimmed) {
        return { isValid: false, data: null, error: 'JSON string is empty' };
      }
      const data = JSON.parse(trimmed);
      if (typeof data !== 'object' || data === null) {
        return { isValid: false, data: null, error: 'JSON root must be an object' };
      }
      return { isValid: true, data: data, error: null };
    } catch (error) {
      return { isValid: false, data: null, error: 'JSON parse error: ' + error.message };
    }
  }

  /**
   * Check for presence of all required fields
   * @param {Object} data - Data object to validate
   * @returns {Array<string>} List of missing field names (empty if all present)
   * @required-fields categoryMoveStats, moveHistory, searchHistory, errorLog
   * @example
   * const missing = validateRequiredFields(data);
   * if (missing.length > 0) { showError('Missing: ' + missing.join(', ')); }
   */
  function validateRequiredFields(data) {
    const missing = [];
    const requiredFields = ['categoryMoveStats', 'moveHistory', 'searchHistory', 'errorLog'];
    for (const field of requiredFields) {
      if (!(field in data)) missing.push(field);
    }
    return missing;
  }

  /**
   * Validate data types of all fields
   * @param {Object} data - Data object to validate
   * @returns {Array<string>} List of type error messages
   * @type-constraints
   *   - categoryMoveStats: object (not array)
   *   - categoryMoveStats.totalMoves: number (if present)
   *   - categoryMoveStats.totalTimeSaved: number (if present)
   *   - moveHistory: array
   *   - searchHistory: array
   *   - errorLog: array
   * @example
   * const errors = validateDataTypes(data);
   * if (errors.length > 0) { showErrors(errors); }
   */
  function validateDataTypes(data) {
    const typeErrors = [];
    if (data.categoryMoveStats) {
      const stats = data.categoryMoveStats;
      if (typeof stats !== 'object' || Array.isArray(stats)) {
        typeErrors.push('categoryMoveStats must be an object');
      } else {
        if ('totalMoves' in stats && typeof stats.totalMoves !== 'number') {
          typeErrors.push('categoryMoveStats.totalMoves must be a number');
        }
        if ('totalTimeSaved' in stats && typeof stats.totalTimeSaved !== 'number') {
          typeErrors.push('categoryMoveStats.totalTimeSaved must be a number');
        }
      }
    }
    if (data.moveHistory && !Array.isArray(data.moveHistory)) {
      typeErrors.push('moveHistory must be an array');
    }
    if (data.searchHistory && !Array.isArray(data.searchHistory)) {
      typeErrors.push('searchHistory must be an array');
    }
    if (data.errorLog && !Array.isArray(data.errorLog)) {
      typeErrors.push('errorLog must be an array');
    }
    return typeErrors;
  }

  /**
   * Validate ISO 8601 timestamp formats
   * @param {Object} data - Data object containing timestamps
   * @returns {Array<string>} List of timestamp format error messages
   * @timestamp-format ISO 8601: YYYY-MM-DDTHH:mm:ss[.sss]Z
   * @fields-checked categoryMoveStats.lastReset (if present)
   * @example
   * const errors = validateTimestampFormats(data);
   * if (errors.length > 0) { showWarnings(errors); }
   */
  function validateTimestampFormats(data) {
    const timestampErrors = [];
    if (data.categoryMoveStats && data.categoryMoveStats.lastReset) {
      if (!ISO_8601_REGEX.test(data.categoryMoveStats.lastReset)) {
        timestampErrors.push('Invalid ISO 8601 format: ' + data.categoryMoveStats.lastReset);
      }
    }
    return timestampErrors;
  }

  /**
   * Verify schema version compatibility
   * @param {Object} data - Data object with optional version field
   * @returns {Object} Schema version result
   * @returns {Object.compatible} boolean - Whether version is supported
   * @returns {Object.version} number - Schema version (defaults to 1)
   * @returns {Object.message} string - Compatibility status message
   * @supported-versions [1]
   * @default-version 1 (if version field not present)
   * @example
   * const versionResult = validateSchemaVersion(data);
   * if (!versionResult.compatible) { showError(versionResult.message); }
   */
  function validateSchemaVersion(data) {
    const version = data.version || 1;
    if (!SUPPORTED_SCHEMA_VERSIONS.includes(version)) {
      return {
        compatible: false,
        version: version,
        message: 'Schema version ' + version + ' not supported'
      };
    }
    return { compatible: true, version: version, message: 'Compatible' };
  }

  /**
   * Check data size boundaries and warn if exceeded
   * @param {Object} data - Data object to validate
   * @returns {Array<string>} List of boundary warning messages
   * @boundary-limits
   *   - moveHistory: max 500 items (warning only, data truncated if valid)
   *   - searchHistory: max 50 items (warning only, data truncated if valid)
   *   - errorLog: max 100 items (warning only, data truncated if valid)
   * @note Data is only truncated if validation passes (isValid=true)
   * @example
   * const warnings = validateDataBoundaries(data);
   * warnings.forEach(w => console.warn(w));
   */
  function validateDataBoundaries(data) {
    const warnings = [];
    if (data.moveHistory && data.moveHistory.length > 500) {
      warnings.push('moveHistory exceeds max 500 records');
    }
    if (data.searchHistory && data.searchHistory.length > 50) {
      warnings.push('searchHistory exceeds max 50 records');
    }
    if (data.errorLog && data.errorLog.length > 100) {
      warnings.push('errorLog exceeds max 100 records');
    }
    return warnings;
  }

  /**
   * Generate summary statistics about imported data
   * @param {Object} data - Data object to summarize
   * @returns {Object} Summary object with statistics
   * @returns {Object.totalMoves} number - Total number of category moves
   * @returns {Object.totalTimeSaved} number - Total time saved (seconds)
   * @returns {Object.moveRecords} number - Count of move history items
   * @returns {Object.searchQueries} number - Count of search history items
   * @returns {Object.errorRecords} number - Count of error log items
   * @returns {Object.exportDate} string | null - When data was exported
   * @returns {Object.importDate} string - ISO 8601 timestamp of import
   * @example
   * const summary = generateDataSummary(data);
   * console.log(`Importing ${summary.moveRecords} move records`);
   */
  function generateDataSummary(data) {
    return {
      totalMoves: (data.categoryMoveStats || {}).totalMoves || 0,
      totalTimeSaved: (data.categoryMoveStats || {}).totalTimeSaved || 0,
      moveRecords: Array.isArray(data.moveHistory) ? data.moveHistory.length : 0,
      searchQueries: Array.isArray(data.searchHistory) ? data.searchHistory.length : 0,
      errorRecords: Array.isArray(data.errorLog) ? data.errorLog.length : 0,
      exportDate: data.exportDate || null,
      importDate: new Date().toISOString()
    };
  }

  /**
   * Complete validation of import JSON data
   *
   * Performs comprehensive validation with multiple checks:
   * 1. JSON format validation
   * 2. Schema version compatibility
   * 3. Required fields presence
   * 4. Data type checking
   * 5. Timestamp format validation
   * 6. Boundary constraints
   * 7. Data truncation (if valid)
   *
   * @param {string} jsonString - JSON string to validate
   * @returns {Object} Complete validation result
   * @returns {Object.isValid} boolean - Overall validity (false if any critical error)
   * @returns {Object.data} object | null - Parsed data (null if invalid)
   * @returns {Object.errors} Array<Object> - Critical errors that prevent import
   * @returns {Object.warnings} Array<Object> - Non-critical warnings
   * @returns {Object.summary} object | null - Data statistics (if valid)
   * @returns {Object.schemaVersion} Object - Schema version compatibility info
   * @truncation-behavior
   *   - moveHistory: truncated to last 500 items (only if isValid=true)
   *   - searchHistory: truncated to last 50 items (only if isValid=true)
   *   - errorLog: truncated to last 100 items (only if isValid=true)
   * @example
   * const result = validateImportData(jsonString);
   * if (result.isValid) {
   *   console.log('Import summary:', result.summary);
   *   applyData(result.data);
   * } else {
   *   result.errors.forEach(e => console.error(e.message));
   * }
   */
  function validateImportData(jsonString) {
    const result = {
      isValid: true,
      data: null,
      errors: [],
      warnings: [],
      summary: null,
      schemaVersion: null
    };

    const formatResult = validateJsonFormat(jsonString);
    if (!formatResult.isValid) {
      result.isValid = false;
      result.errors.push({
        severity: SEVERITY.ERROR,
        type: 'JSON_FORMAT_ERROR',
        message: formatResult.error
      });
      return result;
    }

    const data = formatResult.data;
    result.data = data;

    const versionResult = validateSchemaVersion(data);
    result.schemaVersion = versionResult;
    if (!versionResult.compatible) {
      result.isValid = false;
      result.errors.push({
        severity: SEVERITY.ERROR,
        type: 'SCHEMA_VERSION_ERROR',
        message: versionResult.message
      });
      return result;
    }

    const missingFields = validateRequiredFields(data);
    if (missingFields.length > 0) {
      result.isValid = false;
      result.errors.push({
        severity: SEVERITY.ERROR,
        type: 'MISSING_FIELDS',
        message: 'Missing: ' + missingFields.join(', ')
      });
    }

    const typeErrors = validateDataTypes(data);
    if (typeErrors.length > 0) {
      result.isValid = false;
      typeErrors.forEach(message => {
        result.errors.push({ severity: SEVERITY.ERROR, type: 'TYPE_ERROR', message: message });
      });
    }

    const timestampErrors = validateTimestampFormats(data);
    timestampErrors.forEach(message => {
      result.warnings.push({ severity: SEVERITY.WARNING, type: 'TIMESTAMP_FORMAT_WARNING', message: message });
    });

    const boundaryWarnings = validateDataBoundaries(data);
    boundaryWarnings.forEach(message => {
      result.warnings.push({ severity: SEVERITY.WARNING, type: 'DATA_BOUNDARY_WARNING', message: message });
    });

    result.summary = generateDataSummary(data);

    if (result.isValid && data.moveHistory && data.moveHistory.length > 500) {
      data.moveHistory = data.moveHistory.slice(-500);
    }
    if (result.isValid && data.searchHistory && data.searchHistory.length > 50) {
      data.searchHistory = data.searchHistory.slice(-50);
    }
    if (result.isValid && data.errorLog && data.errorLog.length > 100) {
      data.errorLog = data.errorLog.slice(-100);
    }

    return result;
  }

  return {
    validateImportData: validateImportData,
    validateJsonFormat: validateJsonFormat,
    validateRequiredFields: validateRequiredFields,
    validateDataTypes: validateDataTypes,
    validateTimestampFormats: validateTimestampFormats,
    validateSchemaVersion: validateSchemaVersion,
    validateDataBoundaries: validateDataBoundaries,
    generateDataSummary: generateDataSummary,
    SEVERITY: SEVERITY
  };
})();

if (typeof window !== 'undefined') {
  window.ShoplineImportValidator = ShoplineImportValidator;
}
