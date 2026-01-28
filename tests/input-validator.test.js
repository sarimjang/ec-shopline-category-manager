/**
 * Input Validator Tests
 * 測試輸入驗證器的所有驗證函數
 */

'use strict';

// Mock logger
window.ShoplineLogger = {
  log: (msg, data) => console.log('[TEST_LOGGER]', msg, data || ''),
  error: (msg, err) => console.error('[TEST_LOGGER]', msg, err || ''),
  warn: (msg, data) => console.warn('[TEST_LOGGER]', msg, data || '')
};

describe('ShoplineInputValidator', () => {
  let validator;

  beforeEach(() => {
    // Load the validator module
    // In a real test environment, this would be handled by the test runner
    expect(typeof ShoplineInputValidator).toBe('object');
    validator = ShoplineInputValidator;
  });

  // ========================================================================
  // 1. 基本結構驗證
  // ========================================================================

  describe('validateRequestStructure', () => {
    it('should reject null request', () => {
      const result = validator.validateRequestStructure(null);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject request without action', () => {
      const result = validator.validateRequestStructure({ data: 'test' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'action')).toBe(true);
    });

    it('should accept valid request structure', () => {
      const result = validator.validateRequestStructure({ action: 'getStats' });
      expect(result.valid).toBe(true);
    });
  });

  // ========================================================================
  // 2. 操作名稱驗證
  // ========================================================================

  describe('validateAction', () => {
    it('should reject non-string action', () => {
      const result = validator.validateAction(123);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.type === 'TYPE_ERROR')).toBe(true);
    });

    it('should reject unknown action', () => {
      const result = validator.validateAction('unknownAction');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.type === 'WHITELIST_ERROR')).toBe(true);
    });

    it('should reject action with XSS attempt', () => {
      const result = validator.validateAction('getStats<script>alert("xss")</script>');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.type === 'INJECTION_DETECTED')).toBe(true);
    });

    it('should accept valid action', () => {
      const result = validator.validateAction('getStats');
      expect(result.valid).toBe(true);
    });

    it('should accept all whitelisted actions', () => {
      const actions = Object.keys(validator.ALLOWED_ACTIONS);
      actions.forEach(action => {
        const result = validator.validateAction(action);
        expect(result.valid).toBe(true);
      });
    });
  });

  // ========================================================================
  // 3. 查詢字符串驗證
  // ========================================================================

  describe('validateQuery', () => {
    it('should reject non-string query', () => {
      const result = validator.validateQuery(123);
      expect(result.valid).toBe(false);
    });

    it('should reject empty query', () => {
      const result = validator.validateQuery('');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.type === 'EMPTY_VALUE')).toBe(true);
    });

    it('should reject query with SQL injection', () => {
      const result = validator.validateQuery('test DROP TABLE users');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.type === 'INJECTION_DETECTED')).toBe(true);
    });

    it('should accept valid query', () => {
      const result = validator.validateQuery('test query');
      expect(result.valid).toBe(true);
    });

    it('should reject query exceeding max length', () => {
      const longQuery = 'a'.repeat(501);
      const result = validator.validateQuery(longQuery);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.type === 'LENGTH_ERROR')).toBe(true);
    });
  });

  // ========================================================================
  // 4. 分類 ID 驗證
  // ========================================================================

  describe('validateCategoryId', () => {
    it('should reject non-string/non-number categoryId', () => {
      const result = validator.validateCategoryId({});
      expect(result.valid).toBe(false);
    });

    it('should accept string categoryId', () => {
      const result = validator.validateCategoryId('cat-123');
      expect(result.valid).toBe(true);
    });

    it('should accept numeric categoryId', () => {
      const result = validator.validateCategoryId(123);
      expect(result.valid).toBe(true);
    });

    it('should reject categoryId with invalid characters', () => {
      const result = validator.validateCategoryId('cat@123');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.type === 'FORMAT_ERROR')).toBe(true);
    });
  });

  // ========================================================================
  // 5. 時間節省值驗證
  // ========================================================================

  describe('validateTimeSaved', () => {
    it('should reject non-number timeSaved', () => {
      const result = validator.validateTimeSaved('100');
      expect(result.valid).toBe(false);
    });

    it('should reject negative timeSaved', () => {
      const result = validator.validateTimeSaved(-10);
      expect(result.valid).toBe(false);
    });

    it('should reject non-integer timeSaved', () => {
      const result = validator.validateTimeSaved(10.5);
      expect(result.valid).toBe(false);
    });

    it('should accept valid timeSaved', () => {
      const result = validator.validateTimeSaved(100);
      expect(result.valid).toBe(true);
    });
  });

  // ========================================================================
  // 6. 錯誤類型驗證
  // ========================================================================

  describe('validateErrorType', () => {
    it('should reject non-string errorType', () => {
      const result = validator.validateErrorType(123);
      expect(result.valid).toBe(false);
    });

    it('should reject unknown errorType', () => {
      const result = validator.validateErrorType('unknown');
      expect(result.valid).toBe(false);
    });

    it('should accept valid errorTypes', () => {
      ['network', 'api', 'validation', 'scope'].forEach(type => {
        const result = validator.validateErrorType(type);
        expect(result.valid).toBe(true);
      });
    });
  });

  // ========================================================================
  // 7. 錯誤訊息驗證
  // ========================================================================

  describe('validateErrorMessage', () => {
    it('should reject non-string message', () => {
      const result = validator.validateErrorMessage(123);
      expect(result.valid).toBe(false);
    });

    it('should reject message with script injection', () => {
      const result = validator.validateErrorMessage('<script>alert("xss")</script>');
      expect(result.valid).toBe(false);
    });

    it('should accept valid message', () => {
      const result = validator.validateErrorMessage('An error occurred');
      expect(result.valid).toBe(true);
    });
  });

  // ========================================================================
  // 8. JSON 字符串驗證
  // ========================================================================

  describe('validateJsonString', () => {
    it('should reject non-string jsonString', () => {
      const result = validator.validateJsonString({});
      expect(result.valid).toBe(false);
    });

    it('should reject empty jsonString', () => {
      const result = validator.validateJsonString('');
      expect(result.valid).toBe(false);
    });

    it('should accept valid jsonString', () => {
      const result = validator.validateJsonString('{"key": "value"}');
      expect(result.valid).toBe(true);
    });

    it('should reject deeply nested JSON', () => {
      // Create a deeply nested JSON
      let nested = '{"a":';
      for (let i = 0; i < 101; i++) {
        nested += '{"b":';
      }
      nested += '1';
      for (let i = 0; i < 101; i++) {
        nested += '}';
      }
      nested += '}';
      
      const result = validator.validateJsonString(nested);
      expect(result.valid).toBe(false);
    });
  });

  // ========================================================================
  // 9. 數據對象驗證
  // ========================================================================

  describe('validateDataObject', () => {
    it('should reject null data', () => {
      const result = validator.validateDataObject(null);
      expect(result.valid).toBe(false);
    });

    it('should reject array data', () => {
      const result = validator.validateDataObject([1, 2, 3]);
      expect(result.valid).toBe(false);
    });

    it('should reject unknown keys', () => {
      const result = validator.validateDataObject({ unknownKey: 'value' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.type === 'WHITELIST_ERROR')).toBe(true);
    });

    it('should accept valid data object', () => {
      const result = validator.validateDataObject({
        categoryMoveStats: { totalMoves: 0 },
        moveHistory: []
      });
      expect(result.valid).toBe(true);
    });
  });

  // ========================================================================
  // 10. 分類數據驗證
  // ========================================================================

  describe('validateCategories', () => {
    it('should reject non-array categories', () => {
      const result = validator.validateCategories('not an array');
      expect(result.valid).toBe(false);
    });

    it('should reject categories without id field', () => {
      const result = validator.validateCategories([{ name: 'Test' }]);
      expect(result.valid).toBe(false);
    });

    it('should accept valid categories', () => {
      const result = validator.validateCategories([
        { id: '1', name: 'Test' },
        { id: '2', name: 'Test 2' }
      ]);
      expect(result.valid).toBe(true);
    });

    it('should reject too many categories', () => {
      const categories = [];
      for (let i = 0; i < 10001; i++) {
        categories.push({ id: String(i) });
      }
      const result = validator.validateCategories(categories);
      expect(result.valid).toBe(false);
    });
  });

  // ========================================================================
  // 11. XSS 防護測試
  // ========================================================================

  describe('escapeXSS', () => {
    it('should escape dangerous characters', () => {
      const dangerous = '<script>alert("xss")</script>';
      const escaped = validator.escapeXSS(dangerous);
      expect(escaped).not.toContain('<');
      expect(escaped).not.toContain('>');
      expect(escaped).toContain('&lt;');
      expect(escaped).toContain('&gt;');
    });

    it('should handle empty string', () => {
      const result = validator.escapeXSS('');
      expect(result).toBe('');
    });

    it('should handle non-string input', () => {
      const result = validator.escapeXSS(null);
      expect(result).toBe('');
    });
  });

  // ========================================================================
  // 12. 注入攻擊檢測
  // ========================================================================

  describe('detectInjectionAttacks', () => {
    it('should detect SQL injection', () => {
      const attacks = validator.detectInjectionAttacks('SELECT * FROM users');
      expect(attacks.length).toBeGreaterThan(0);
      expect(attacks.some(a => a.type === 'SQL_INJECTION')).toBe(true);
    });

    it('should detect script injection', () => {
      const attacks = validator.detectInjectionAttacks('<script>alert("xss")</script>');
      expect(attacks.length).toBeGreaterThan(0);
      expect(attacks.some(a => a.type === 'SCRIPT_INJECTION')).toBe(true);
    });

    it('should detect null byte injection', () => {
      const attacks = validator.detectInjectionAttacks('test\0null');
      expect(attacks.length).toBeGreaterThan(0);
      expect(attacks.some(a => a.type === 'NULL_BYTE_INJECTION')).toBe(true);
    });

    it('should not detect benign input', () => {
      const attacks = validator.detectInjectionAttacks('normal input');
      expect(attacks.length).toBe(0);
    });
  });

  // ========================================================================
  // 13. 字符串長度驗證
  // ========================================================================

  describe('validateStringLength', () => {
    it('should reject non-string input', () => {
      const result = validator.validateStringLength(123, 100);
      expect(result.valid).toBe(false);
    });

    it('should reject string exceeding max length', () => {
      const result = validator.validateStringLength('a'.repeat(101), 100);
      expect(result.valid).toBe(false);
    });

    it('should accept string within limit', () => {
      const result = validator.validateStringLength('test', 100);
      expect(result.valid).toBe(true);
    });
  });

  // ========================================================================
  // 14. 日誌功能測試
  // ========================================================================

  describe('logRejectedRequest', () => {
    it('should log rejected request', () => {
      const consoleSpy = spyOn(console, 'warn');
      const request = { action: 'unknownAction' };
      const validationResult = {
        errors: [{ field: 'action', error: 'Unknown action' }]
      };
      
      validator.logRejectedRequest(request, validationResult);
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// 集成測試
// ============================================================================

describe('Input Validation Integration', () => {
  it('should validate complete message flow', () => {
    const validator = ShoplineInputValidator;

    // Valid request
    const validRequest = {
      action: 'recordSearchQuery',
      query: 'test query'
    };

    const structValidation = validator.validateRequestStructure(validRequest);
    expect(structValidation.valid).toBe(true);

    const actionValidation = validator.validateAction(validRequest.action);
    expect(actionValidation.valid).toBe(true);

    const queryValidation = validator.validateQuery(validRequest.query);
    expect(queryValidation.valid).toBe(true);
  });

  it('should reject malicious request flow', () => {
    const validator = ShoplineInputValidator;

    // Malicious request with SQL injection
    const maliciousRequest = {
      action: 'recordSearchQuery',
      query: 'SELECT * FROM users; DROP TABLE users;'
    };

    const queryValidation = validator.validateQuery(maliciousRequest.query);
    expect(queryValidation.valid).toBe(false);
    expect(queryValidation.errors.some(e => e.type === 'INJECTION_DETECTED')).toBe(true);
  });
});
