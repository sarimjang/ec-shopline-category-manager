/**
 * Input Validator - Comprehensive input validation and sanitization
 * 防止 XSS、注入攻擊和數據完整性問題
 * 
 * 驗證規則：
 * 1. 類型檢查 - 參數是否符合預期類型
 * 2. 長度限制 - 字符串長度不超過限制
 * 3. 白名單驗證 - 操作和鍵必須在允許列表中
 * 4. XSS 防護 - 轉義危險字符
 * 5. 注入攻擊防護 - 驗證輸入模式
 */

'use strict';

const ShoplineInputValidator = (function() {
  const logger = window.ShoplineLogger || console;

  // ============================================================================
  // 常數定義
  // ============================================================================

  const ALLOWED_ACTIONS = {
    'getCategories': true,
    'updateCategories': true,
    'exportData': true,
    'validateImportData': true,
    'executeImportData': true,
    'recordCategoryMove': true,
    'getStats': true,
    'resetStats': true,
    'getSearchHistory': true,
    'recordSearchQuery': true,
    'classifyError': true,
    'getErrorLog': true,
    'validateCategoryPath': true,
    'getMoveHistory': true
  };

  const ALLOWED_STORAGE_KEYS = {
    'categories': true,
    'categoryMoveStats': true,
    'moveHistory': true,
    'searchHistory': true,
    'errorLog': true,
    'importTimestamp': true,
    'exports': true,
    'imports': true
  };

  const ERROR_TYPES = {
    'network': true,
    'api': true,
    'validation': true,
    'scope': true
  };

  // 長度限制
  const LIMITS = {
    action: 100,
    query: 500,
    categoryId: 200,
    targetCategoryId: 200,
    categoryName: 255,
    message: 5000,
    errorMessage: 2000,
    timeSaved: 999999,
    jsonString: 10 * 1024 * 1024 // 10MB
  };

  // XSS 防護：危險字符集
  const DANGEROUS_CHARS_REGEX = /[<>\"'`&]/g;
  const XSS_ESCAPE_MAP = {
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '`': '&#x60;',
    '&': '&amp;'
  };

  // 注入攻擊防護：檢測可疑模式
  const SQL_INJECTION_PATTERN = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXECUTE|UNION|WHERE)\b)/gi;
  const SCRIPT_INJECTION_PATTERN = /<script|javascript:|on\w+\s*=/gi;

  // ============================================================================
  // 工具函數
  // ============================================================================

  /**
   * Escape string to prevent XSS attacks
   * Converts dangerous HTML characters to entities
   * @param {string} str - String to escape
   * @returns {string} Escaped string (or empty string if not a string)
   * @character-mapping < → &lt; | > → &gt; | " → &quot; | ' → &#39; | ` → &#x60; | & → &amp;
   * @example
   * const escaped = escapeXSS('<script>alert("xss")</script>');
   * // → '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
   */
  function escapeXSS(str) {
    if (typeof str !== 'string') {
      return '';
    }
    return str.replace(DANGEROUS_CHARS_REGEX, char => XSS_ESCAPE_MAP[char] || char);
  }

  /**
   * Detect potential injection attack patterns in strings
   * @param {string} input - String to analyze
   * @returns {Array<Object>} List of detected attacks with {type, pattern, severity}
   * @attack-types
   *   - SQL_INJECTION: SQL keywords (SELECT, DROP, INSERT, etc) - severity HIGH
   *   - SCRIPT_INJECTION: Script tags or event handlers - severity CRITICAL
   *   - NULL_BYTE_INJECTION: Null byte character \0 - severity HIGH
   *   - DEEP_NESTING: Excessive JSON nesting (>100 levels) - severity MEDIUM
   * @example
   * const attacks = detectInjectionAttacks('SELECT * FROM users');
   * if (attacks.length > 0) { reject input; }
   */
  function detectInjectionAttacks(input) {
    const attacks = [];

    if (typeof input !== 'string') {
      return attacks;
    }

    // 檢測 SQL 注入
    if (SQL_INJECTION_PATTERN.test(input)) {
      attacks.push({
        type: 'SQL_INJECTION',
        pattern: 'SQL keywords detected',
        severity: 'HIGH'
      });
    }

    // 檢測腳本注入
    if (SCRIPT_INJECTION_PATTERN.test(input)) {
      attacks.push({
        type: 'SCRIPT_INJECTION',
        pattern: 'Script tags or event handlers detected',
        severity: 'CRITICAL'
      });
    }

    // 檢測 null bytes（可能用於文件操作注入）
    if (input.includes('\0')) {
      attacks.push({
        type: 'NULL_BYTE_INJECTION',
        pattern: 'Null byte detected',
        severity: 'HIGH'
      });
    }

    // 檢測過度嵌套的 JSON（DoS 攻擊防護）
    const nestingDepth = (input.match(/[{[]/g) || []).length;
    if (nestingDepth > 100) {
      attacks.push({
        type: 'DEEP_NESTING',
        pattern: 'Excessive JSON nesting detected',
        severity: 'MEDIUM'
      });
    }

    return attacks;
  }

  /**
   * Validate string length constraints
   * @param {string} str - String to validate
   * @param {number} maxLength - Maximum allowed length
   * @returns {Object} Validation result
   * @returns {Object.valid} boolean - Whether string is within limit
   * @returns {Object.length} number | null - Actual length (or null if not string)
   * @returns {Object.maxLength} number - Maximum allowed length
   * @returns {Object.error} string - Error message if invalid
   * @example
   * const result = validateStringLength(query, 500);
   * if (!result.valid) { showError(result.error); }
   */
  function validateStringLength(str, maxLength) {
    if (typeof str !== 'string') {
      return {
        valid: false,
        error: 'Input is not a string',
        length: null
      };
    }

    const length = str.length;
    if (length > maxLength) {
      return {
        valid: false,
        error: `String exceeds maximum length of ${maxLength} characters (current: ${length})`,
        length: length,
        maxLength: maxLength
      };
    }

    return {
      valid: true,
      length: length,
      maxLength: maxLength
    };
  }

  // ============================================================================
  // 核心驗證函數
  // ============================================================================

  /**
   * Validate basic request structure
   * @param {Object} request - Request object to validate
   * @returns {Object} Validation result
   * @returns {boolean} result.valid - Whether request is valid
   * @returns {Array<Object>} result.errors - List of validation errors
   * @example
   * const result = validateRequestStructure({ action: 'getStats' });
   * if (result.valid) { ... }
   */
  function validateRequestStructure(request) {
    const errors = [];

    if (!request || typeof request !== 'object') {
      errors.push({
        field: 'request',
        error: 'Request must be a non-null object',
        type: 'INVALID_STRUCTURE'
      });
      return { valid: false, errors };
    }

    if (!('action' in request)) {
      errors.push({
        field: 'action',
        error: 'Missing required field: action',
        type: 'MISSING_FIELD'
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate action name against whitelist and security rules
   * @param {string} action - Action name to validate
   * @returns {Object} Validation result {valid, errors}
   * @throws No exceptions, returns error in result
   * @constraints
   *   - Must be string type
   *   - Max 100 characters
   *   - Must be in ALLOWED_ACTIONS whitelist
   *   - Must not contain injection attack patterns
   * @example
   * const result = validateAction('getStats');
   * if (result.valid) { processAction(...); }
   */
  function validateAction(action) {
    const errors = [];

    // 類型檢查
    if (typeof action !== 'string') {
      errors.push({
        field: 'action',
        error: 'Action must be a string',
        type: 'TYPE_ERROR'
      });
      return { valid: false, errors };
    }

    // 長度限制
    const lengthCheck = validateStringLength(action, LIMITS.action);
    if (!lengthCheck.valid) {
      errors.push({
        field: 'action',
        error: lengthCheck.error,
        type: 'LENGTH_ERROR'
      });
    }

    // 白名單驗證
    if (!ALLOWED_ACTIONS[action]) {
      errors.push({
        field: 'action',
        error: `Unknown action: ${action}. Allowed actions: ${Object.keys(ALLOWED_ACTIONS).join(', ')}`,
        type: 'WHITELIST_ERROR'
      });
    }

    // XSS 檢測
    const injectionAttacks = detectInjectionAttacks(action);
    if (injectionAttacks.length > 0) {
      errors.push({
        field: 'action',
        error: `Potential injection attack detected: ${injectionAttacks.map(a => a.type).join(', ')}`,
        type: 'INJECTION_DETECTED',
        attacks: injectionAttacks
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate search/filter query strings
   * @param {string} query - Query string to validate
   * @returns {Object} Validation result {valid, errors}
   * @constraints
   *   - Must be string type
   *   - Max 500 characters
   *   - Must not be empty or whitespace-only
   *   - Must not contain injection attack patterns
   * @example
   * const result = validateQuery('category name');
   * if (result.valid) { performSearch(query); }
   */
  function validateQuery(query) {
    const errors = [];

    // 類型檢查
    if (typeof query !== 'string') {
      errors.push({
        field: 'query',
        error: 'Query must be a string',
        type: 'TYPE_ERROR'
      });
      return { valid: false, errors };
    }

    // 長度限制
    const lengthCheck = validateStringLength(query, LIMITS.query);
    if (!lengthCheck.valid) {
      errors.push({
        field: 'query',
        error: lengthCheck.error,
        type: 'LENGTH_ERROR'
      });
      return { valid: false, errors };
    }

    // 空字符串檢查
    if (query.trim() === '') {
      errors.push({
        field: 'query',
        error: 'Query cannot be empty',
        type: 'EMPTY_VALUE'
      });
    }

    // 注入攻擊檢測
    const injectionAttacks = detectInjectionAttacks(query);
    if (injectionAttacks.length > 0) {
      errors.push({
        field: 'query',
        error: `Potential injection attack detected: ${injectionAttacks.map(a => a.type).join(', ')}`,
        type: 'INJECTION_DETECTED',
        attacks: injectionAttacks
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate category identifiers
   * @param {string|number} categoryId - Category ID to validate
   * @returns {Object} Validation result {valid, errors}
   * @constraints
   *   - Must be string or number
   *   - Max 200 characters
   *   - Format: alphanumeric, underscore, hyphen only (/^[a-zA-Z0-9_-]+$/)
   * @example
   * const result = validateCategoryId('cat-123');
   * if (result.valid) { updateCategory(...); }
   */
  function validateCategoryId(categoryId) {
    const errors = [];

    // 類型檢查
    if (typeof categoryId !== 'string' && typeof categoryId !== 'number') {
      errors.push({
        field: 'categoryId',
        error: 'Category ID must be a string or number',
        type: 'TYPE_ERROR'
      });
      return { valid: false, errors };
    }

    const categoryIdStr = String(categoryId);

    // 長度限制
    const lengthCheck = validateStringLength(categoryIdStr, LIMITS.categoryId);
    if (!lengthCheck.valid) {
      errors.push({
        field: 'categoryId',
        error: lengthCheck.error,
        type: 'LENGTH_ERROR'
      });
      return { valid: false, errors };
    }

    // 驗證格式（應該是數字或有效的 ID 格式）
    if (!/^[a-zA-Z0-9_-]+$/.test(categoryIdStr)) {
      errors.push({
        field: 'categoryId',
        error: 'Category ID contains invalid characters. Allowed: alphanumeric, underscore, hyphen',
        type: 'FORMAT_ERROR'
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate time saved values (in seconds)
   * @param {number} timeSaved - Time saved in seconds
   * @returns {Object} Validation result {valid, errors}
   * @constraints
   *   - Must be number type (not string)
   *   - Must be non-negative
   *   - Must be integer (no decimals)
   *   - Max value: 999,999
   * @example
   * const result = validateTimeSaved(100);
   * if (result.valid) { recordStat(timeSaved); }
   */
  function validateTimeSaved(timeSaved) {
    const errors = [];

    // 類型檢查
    if (typeof timeSaved !== 'number') {
      errors.push({
        field: 'timeSaved',
        error: 'Time saved must be a number',
        type: 'TYPE_ERROR'
      });
      return { valid: false, errors };
    }

    // 非負檢查
    if (timeSaved < 0) {
      errors.push({
        field: 'timeSaved',
        error: 'Time saved cannot be negative',
        type: 'VALIDATION_ERROR'
      });
    }

    // 上限檢查
    if (timeSaved > LIMITS.timeSaved) {
      errors.push({
        field: 'timeSaved',
        error: `Time saved exceeds maximum value of ${LIMITS.timeSaved}`,
        type: 'VALIDATION_ERROR'
      });
    }

    // 整數檢查
    if (!Number.isInteger(timeSaved)) {
      errors.push({
        field: 'timeSaved',
        error: 'Time saved must be an integer',
        type: 'TYPE_ERROR'
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate error classification types
   * @param {string} errorType - Error type to validate
   * @returns {Object} Validation result {valid, errors}
   * @constraints
   *   - Must be string type
   *   - Must be in ERROR_TYPES whitelist: 'network', 'api', 'validation', 'scope'
   * @example
   * const result = validateErrorType('network');
   * if (result.valid) { recordError(...); }
   */
  function validateErrorType(errorType) {
    const errors = [];

    // 類型檢查
    if (typeof errorType !== 'string') {
      errors.push({
        field: 'errorType',
        error: 'Error type must be a string',
        type: 'TYPE_ERROR'
      });
      return { valid: false, errors };
    }

    // 白名單驗證
    if (!ERROR_TYPES[errorType]) {
      errors.push({
        field: 'errorType',
        error: `Invalid error type: ${errorType}. Allowed: ${Object.keys(ERROR_TYPES).join(', ')}`,
        type: 'WHITELIST_ERROR'
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate error message strings
   * @param {string} message - Error message to validate
   * @returns {Object} Validation result {valid, errors}
   * @constraints
   *   - Must be string type
   *   - Max 2,000 characters
   *   - Must not contain injection attack patterns
   * @example
   * const result = validateErrorMessage('An error occurred');
   * if (result.valid) { logError(message); }
   */
  function validateErrorMessage(message) {
    const errors = [];

    // 類型檢查
    if (typeof message !== 'string') {
      errors.push({
        field: 'message',
        error: 'Message must be a string',
        type: 'TYPE_ERROR'
      });
      return { valid: false, errors };
    }

    // 長度限制
    const lengthCheck = validateStringLength(message, LIMITS.errorMessage);
    if (!lengthCheck.valid) {
      errors.push({
        field: 'message',
        error: lengthCheck.error,
        type: 'LENGTH_ERROR'
      });
    }

    // 注入攻擊檢測
    const injectionAttacks = detectInjectionAttacks(message);
    if (injectionAttacks.length > 0) {
      errors.push({
        field: 'message',
        error: `Potential injection attack detected: ${injectionAttacks.map(a => a.type).join(', ')}`,
        type: 'INJECTION_DETECTED',
        attacks: injectionAttacks
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate JSON strings (for import data)
   * @param {string} jsonString - JSON string to validate
   * @returns {Object} Validation result {valid, errors}
   * @constraints
   *   - Must be string type
   *   - Max size: 10 MB (10,485,760 bytes)
   *   - Must not be empty
   *   - Must not contain excessive nesting (>100 levels) - prevents DoS
   * @example
   * const result = validateJsonString('{"key":"value"}');
   * if (result.valid) { importData(jsonString); }
   */
  function validateJsonString(jsonString) {
    const errors = [];

    // 類型檢查
    if (typeof jsonString !== 'string') {
      errors.push({
        field: 'jsonString',
        error: 'JSON string must be a string',
        type: 'TYPE_ERROR'
      });
      return { valid: false, errors };
    }

    // 大小限制
    if (jsonString.length > LIMITS.jsonString) {
      errors.push({
        field: 'jsonString',
        error: `JSON string exceeds maximum size of ${LIMITS.jsonString / 1024 / 1024}MB`,
        type: 'SIZE_ERROR'
      });
      return { valid: false, errors };
    }

    // 空值檢查
    if (jsonString.trim() === '') {
      errors.push({
        field: 'jsonString',
        error: 'JSON string cannot be empty',
        type: 'EMPTY_VALUE'
      });
      return { valid: false, errors };
    }

    // 深層嵌套檢測
    const injectionAttacks = detectInjectionAttacks(jsonString);
    if (injectionAttacks.some(a => a.type === 'DEEP_NESTING')) {
      errors.push({
        field: 'jsonString',
        error: 'JSON has excessive nesting depth (potential DoS attack)',
        type: 'INJECTION_DETECTED',
        attacks: injectionAttacks
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate storage data objects with whitelist enforcement
   * @param {Object} data - Data object to validate
   * @returns {Object} Validation result {valid, errors}
   * @constraints
   *   - Must be non-null object (not array)
   *   - All keys must be in ALLOWED_STORAGE_KEYS whitelist:
   *     categories, categoryMoveStats, moveHistory, searchHistory,
   *     errorLog, importTimestamp, exports, imports
   * @example
   * const result = validateDataObject({ categories: [...] });
   * if (result.valid) { await chrome.storage.local.set(data); }
   */
  function validateDataObject(data) {
    const errors = [];

    // 類型檢查
    if (!data || typeof data !== 'object') {
      errors.push({
        field: 'data',
        error: 'Data must be a non-null object',
        type: 'TYPE_ERROR'
      });
      return { valid: false, errors };
    }

    // 數組檢查
    if (Array.isArray(data)) {
      errors.push({
        field: 'data',
        error: 'Data cannot be an array',
        type: 'TYPE_ERROR'
      });
      return { valid: false, errors };
    }

    // 檢查所有鍵是否在白名單中
    const invalidKeys = Object.keys(data).filter(key => !ALLOWED_STORAGE_KEYS[key]);
    if (invalidKeys.length > 0) {
      errors.push({
        field: 'data',
        error: `Invalid storage keys: ${invalidKeys.join(', ')}. Allowed keys: ${Object.keys(ALLOWED_STORAGE_KEYS).join(', ')}`,
        type: 'WHITELIST_ERROR',
        invalidKeys: invalidKeys
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate category data arrays
   * @param {Array} categories - Categories array to validate
   * @returns {Object} Validation result {valid, errors}
   * @constraints
   *   - Must be array (not object, not null)
   *   - Max 10,000 items
   *   - Each item must be non-null object
   *   - Each item must have 'id' field
   * @example
   * const result = validateCategories([{ id: '1', name: 'Cat1' }]);
   * if (result.valid) { updateCategories(...); }
   */
  function validateCategories(categories) {
    const errors = [];

    // 類型檢查
    if (!Array.isArray(categories)) {
      errors.push({
        field: 'categories',
        error: 'Categories must be an array',
        type: 'TYPE_ERROR'
      });
      return { valid: false, errors };
    }

    // 大小限制
    if (categories.length > 10000) {
      errors.push({
        field: 'categories',
        error: 'Too many categories (max 10000)',
        type: 'SIZE_ERROR'
      });
    }

    // 驗證每個分類對象
    categories.forEach((category, index) => {
      if (!category || typeof category !== 'object') {
        errors.push({
          field: `categories[${index}]`,
          error: 'Each category must be a non-null object',
          type: 'TYPE_ERROR'
        });
        return;
      }

      // 驗證必要的 ID 字段
      if (!('id' in category)) {
        errors.push({
          field: `categories[${index}].id`,
          error: 'Category must have an id field',
          type: 'MISSING_FIELD'
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Log rejected/failed validation requests for debugging and security monitoring
   * @param {Object} request - Original request object
   * @param {Object} validationResult - Validation result with errors
   * @side-effects Logs to ShoplineLogger or console
   * @security Logs are important for security incident tracking
   * @example
   * if (!validation.valid) {
   *   logRejectedRequest(request, validation);
   * }
   */
  function logRejectedRequest(request, validationResult) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      action: request.action,
      reason: 'Input validation failed',
      errors: validationResult.errors,
      severity: validationResult.errors.some(e => e.type === 'INJECTION_DETECTED') ? 'CRITICAL' : 'WARNING'
    };

    logger.warn('[InputValidator] Rejected request:', logEntry);

    // 記錄到控制台（用於調試）
    if (process.env.NODE_ENV === 'development' || true) {
      console.warn('[InputValidator] Validation Failure Details:', {
        ...logEntry,
        request: request
      });
    }
  }

  // ============================================================================
  // 公開 API
  // ============================================================================

  return {
    // 基本驗證
    validateRequestStructure,
    validateAction,
    validateQuery,
    validateCategoryId,
    validateTimeSaved,
    validateErrorType,
    validateErrorMessage,
    validateJsonString,
    validateDataObject,
    validateCategories,

    // 工具函數
    escapeXSS,
    detectInjectionAttacks,
    validateStringLength,

    // 日誌
    logRejectedRequest,

    // 常數
    ALLOWED_ACTIONS,
    ALLOWED_STORAGE_KEYS,
    ERROR_TYPES,
    LIMITS
  };
})();

// 匯出到全局作用域
if (typeof window !== 'undefined') {
  window.ShoplineInputValidator = ShoplineInputValidator;
}
