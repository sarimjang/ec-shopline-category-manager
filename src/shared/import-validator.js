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

  function validateRequiredFields(data) {
    const missing = [];
    const requiredFields = ['categoryMoveStats', 'moveHistory', 'searchHistory', 'errorLog'];
    for (const field of requiredFields) {
      if (!(field in data)) missing.push(field);
    }
    return missing;
  }

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

  function validateTimestampFormats(data) {
    const timestampErrors = [];
    if (data.categoryMoveStats && data.categoryMoveStats.lastReset) {
      if (!ISO_8601_REGEX.test(data.categoryMoveStats.lastReset)) {
        timestampErrors.push('Invalid ISO 8601 format: ' + data.categoryMoveStats.lastReset);
      }
    }
    return timestampErrors;
  }

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
