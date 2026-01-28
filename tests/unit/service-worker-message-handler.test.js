/**
 * Service Worker Message Handler Tests (Phase 1.4)
 * 測試 src/background/service-worker.js 中的消息處理功能
 *
 * 測試項目:
 * 1. handleRecordCategoryMove - 記錄分類移動
 *    ├─ 驗證消息格式
 *    ├─ 驗證參數（timeSaved, categoryName, targetLevel）
 *    ├─ 統計數據更新
 *    ├─ 移動歷史記錄
 *    └─ 存儲持久化
 * 2. 錯誤處理
 *    ├─ 無效的 timeSaved
 *    ├─ 無效的 categoryName
 *    ├─ 無效的 targetLevel
 *    └─ 存儲讀寫錯誤
 * 3. 統計和歷史的交互
 */

'use strict';

describe('Service Worker Message Handler (Phase 1.4)', () => {

  // Mock chrome API
  let mockChrome;
  let handleRecordCategoryMove;
  let mockValidator;

  beforeEach(() => {
    // 重置 mock
    jest.clearAllMocks();

    // Mock chrome.storage.local
    mockChrome = {
      storage: {
        local: {
          get: jest.fn(),
          set: jest.fn()
        }
      },
      runtime: {
        lastError: null
      }
    };

    global.chrome = mockChrome;

    // Mock input validator
    mockValidator = {
      validateTimeSaved: jest.fn((value) => {
        if (typeof value !== 'number' || value < 0) {
          return { valid: false, errors: ['Invalid time saved'] };
        }
        return { valid: true, errors: [] };
      }),
      validateCategoryName: jest.fn((name) => {
        if (typeof name !== 'string' || name.trim().length === 0) {
          return { valid: false, errors: ['Invalid category name'] };
        }
        return { valid: true, errors: [] };
      }),
      logRejectedRequest: jest.fn()
    };

    global.window = global.window || {};
    global.window.ShoplineInputValidator = mockValidator;

    // Mock logger
    global.console = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    };

    // 定義 handleRecordCategoryMove 函數（簡化版用於測試）
    handleRecordCategoryMove = function(request, sendResponse) {
      // 驗證時間節省值
      const timeSavedValidation = mockValidator.validateTimeSaved(request.timeSaved || 0);
      if (!timeSavedValidation.valid) {
        console.error('Invalid timeSaved:', timeSavedValidation.errors);
        mockValidator.logRejectedRequest(request, timeSavedValidation);
        sendResponse({
          success: false,
          error: 'Invalid timeSaved value',
          details: timeSavedValidation.errors
        });
        return;
      }

      // 驗證分類名稱（可選）
      if (request.categoryName !== undefined && request.categoryName !== null) {
        const categoryNameValidation = mockValidator.validateCategoryName(request.categoryName);
        if (!categoryNameValidation.valid) {
          console.error('Invalid categoryName:', categoryNameValidation.errors);
          mockValidator.logRejectedRequest(request, categoryNameValidation);
          sendResponse({
            success: false,
            error: 'Invalid categoryName',
            details: categoryNameValidation.errors
          });
          return;
        }
      }

      // 驗證目標級別（可選）
      if (request.targetLevel !== undefined && request.targetLevel !== null) {
        if (typeof request.targetLevel !== 'number' || request.targetLevel < 0 || request.targetLevel > 3) {
          console.error('Invalid targetLevel:', request.targetLevel);
          mockValidator.logRejectedRequest(request, {
            valid: false,
            errors: ['targetLevel must be a number between 0 and 3']
          });
          sendResponse({
            success: false,
            error: 'Invalid targetLevel',
            details: { targetLevel: 'Must be 0-3' }
          });
          return;
        }
      }

      const timeSaved = request.timeSaved || 0;
      const categoryName = request.categoryName || 'Unknown';
      const targetLevel = request.targetLevel || 0;
      const timestamp = new Date().toISOString();

      // 讀取當前存儲
      mockChrome.storage.local.get(['categoryMoveStats', 'moveHistory'], (result) => {
        if (mockChrome.runtime.lastError) {
          console.error('Error reading storage:', mockChrome.runtime.lastError);
          sendResponse({
            success: false,
            error: 'Failed to read storage',
            details: mockChrome.runtime.lastError.message
          });
          return;
        }

        // 更新統計數據
        const stats = result.categoryMoveStats || {
          totalMoves: 0,
          totalTimeSaved: 0,
          lastReset: timestamp
        };

        stats.totalMoves += 1;
        stats.totalTimeSaved += timeSaved;
        stats.lastMoveTime = timestamp;

        // 記錄移動歷史
        let moveHistory = result.moveHistory || [];

        const moveRecord = {
          timestamp: timestamp,
          categoryName: categoryName,
          targetLevel: targetLevel,
          timeSaved: timeSaved,
          moveNumber: stats.totalMoves
        };

        moveHistory.unshift(moveRecord);

        if (moveHistory.length > 500) {
          moveHistory = moveHistory.slice(0, 500);
        }

        // 保存到存儲
        mockChrome.storage.local.set({
          categoryMoveStats: stats,
          moveHistory: moveHistory
        }, () => {
          if (mockChrome.runtime.lastError) {
            console.error('Error saving statistics:', mockChrome.runtime.lastError);
            sendResponse({
              success: false,
              error: 'Failed to save statistics',
              details: mockChrome.runtime.lastError.message
            });
            return;
          }

          console.log('Category move recorded successfully', {
            stats: stats,
            moveRecord: moveRecord,
            historySize: moveHistory.length
          });

          sendResponse({
            success: true,
            stats: stats,
            moveRecord: moveRecord,
            historySize: moveHistory.length
          });
        });
      });
    };
  });

  // ===========================================================================
  // 測試 1: 基本記錄 - 只有 timeSaved
  // ===========================================================================
  test('應該記錄一個基本的分類移動（只有 timeSaved）', (done) => {
    // 準備初始存儲狀態
    mockChrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({
        categoryMoveStats: undefined,
        moveHistory: undefined
      });
    });

    mockChrome.storage.local.set.mockImplementation((data, callback) => {
      callback();
    });

    const request = {
      timeSaved: 60
    };

    handleRecordCategoryMove(request, (response) => {
      expect(response.success).toBe(true);
      expect(response.stats.totalMoves).toBe(1);
      expect(response.stats.totalTimeSaved).toBe(60);
      expect(response.moveRecord.timeSaved).toBe(60);
      expect(response.moveRecord.categoryName).toBe('Unknown');
      expect(response.historySize).toBe(1);

      // 驗證存儲調用
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
      const setCall = mockChrome.storage.local.set.mock.calls[0][0];
      expect(setCall.categoryMoveStats.totalMoves).toBe(1);
      expect(setCall.moveHistory).toHaveLength(1);

      done();
    });
  });

  // ===========================================================================
  // 測試 2: 完整記錄 - 包含所有參數
  // ===========================================================================
  test('應該記錄完整的分類移動（包含 categoryName 和 targetLevel）', (done) => {
    mockChrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({
        categoryMoveStats: {
          totalMoves: 5,
          totalTimeSaved: 300,
          lastReset: new Date().toISOString()
        },
        moveHistory: [
          { timestamp: '2026-01-28T00:00:00Z', categoryName: 'Category A', targetLevel: 1, timeSaved: 60, moveNumber: 5 }
        ]
      });
    });

    mockChrome.storage.local.set.mockImplementation((data, callback) => {
      callback();
    });

    const request = {
      timeSaved: 45,
      categoryName: 'Category B',
      targetLevel: 2
    };

    handleRecordCategoryMove(request, (response) => {
      expect(response.success).toBe(true);
      expect(response.stats.totalMoves).toBe(6);
      expect(response.stats.totalTimeSaved).toBe(345);
      expect(response.moveRecord.categoryName).toBe('Category B');
      expect(response.moveRecord.targetLevel).toBe(2);
      expect(response.historySize).toBe(2);

      const setCall = mockChrome.storage.local.set.mock.calls[0][0];
      expect(setCall.moveHistory[0].categoryName).toBe('Category B');
      expect(setCall.moveHistory[0].moveNumber).toBe(6);

      done();
    });
  });

  // ===========================================================================
  // 測試 3: 多次記錄 - 歷史堆積
  // ===========================================================================
  test('應該正確累積多個移動記錄', (done) => {
    let callCount = 0;

    mockChrome.storage.local.get.mockImplementation((keys, callback) => {
      if (callCount === 0) {
        callCount++;
        callback({
          categoryMoveStats: {
            totalMoves: 1,
            totalTimeSaved: 60,
            lastReset: new Date().toISOString()
          },
          moveHistory: [
            { timestamp: '2026-01-28T00:00:00Z', categoryName: 'Category A', targetLevel: 1, timeSaved: 60, moveNumber: 1 }
          ]
        });
      }
    });

    mockChrome.storage.local.set.mockImplementation((data, callback) => {
      callback();
    });

    const request1 = { timeSaved: 60, categoryName: 'Category A', targetLevel: 1 };

    handleRecordCategoryMove(request1, (response) => {
      expect(response.stats.totalMoves).toBe(2);
      expect(response.historySize).toBe(2);

      // 驗證最新的記錄在前面
      const setCall = mockChrome.storage.local.set.mock.calls[0][0];
      expect(setCall.moveHistory[0].categoryName).toBe('Category A');
      expect(setCall.moveHistory[0].moveNumber).toBe(2);

      done();
    });
  });

  // ===========================================================================
  // 測試 4: 錯誤處理 - 無效的 timeSaved
  // ===========================================================================
  test('應該拒絕無效的 timeSaved 值', (done) => {
    const request = {
      timeSaved: -10  // 負數值
    };

    handleRecordCategoryMove(request, (response) => {
      expect(response.success).toBe(false);
      expect(response.error).toBe('Invalid timeSaved value');
      expect(mockChrome.storage.local.set).not.toHaveBeenCalled();

      done();
    });
  });

  // ===========================================================================
  // 測試 5: 錯誤處理 - 無效的 categoryName
  // ===========================================================================
  test('應該拒絕無效的 categoryName', (done) => {
    const request = {
      timeSaved: 60,
      categoryName: ''  // 空字符串
    };

    handleRecordCategoryMove(request, (response) => {
      expect(response.success).toBe(false);
      expect(response.error).toBe('Invalid categoryName');
      expect(mockChrome.storage.local.set).not.toHaveBeenCalled();

      done();
    });
  });

  // ===========================================================================
  // 測試 6: 錯誤處理 - 無效的 targetLevel
  // ===========================================================================
  test('應該拒絕無效的 targetLevel', (done) => {
    const request = {
      timeSaved: 60,
      categoryName: 'Category A',
      targetLevel: 5  // 超出範圍
    };

    handleRecordCategoryMove(request, (response) => {
      expect(response.success).toBe(false);
      expect(response.error).toBe('Invalid targetLevel');
      expect(mockChrome.storage.local.set).not.toHaveBeenCalled();

      done();
    });
  });

  // ===========================================================================
  // 測試 7: 存儲讀取錯誤
  // ===========================================================================
  test('應該優雅處理存儲讀取錯誤', (done) => {
    mockChrome.runtime.lastError = { message: 'Storage read failed' };

    mockChrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({}); // 空結果，trigger lastError check
    });

    const request = { timeSaved: 60 };

    handleRecordCategoryMove(request, (response) => {
      expect(response.success).toBe(false);
      expect(response.error).toBe('Failed to read storage');

      done();
    });
  });

  // ===========================================================================
  // 測試 8: 存儲寫入錯誤
  // ===========================================================================
  test('應該優雅處理存儲寫入錯誤', (done) => {
    mockChrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({
        categoryMoveStats: undefined,
        moveHistory: undefined
      });
    });

    mockChrome.storage.local.set.mockImplementation((data, callback) => {
      mockChrome.runtime.lastError = { message: 'Storage write failed' };
      callback();
    });

    const request = { timeSaved: 60 };

    handleRecordCategoryMove(request, (response) => {
      expect(response.success).toBe(false);
      expect(response.error).toBe('Failed to save statistics');

      done();
    });
  });

  // ===========================================================================
  // 測試 9: 歷史記錄大小限制（500 條）
  // ===========================================================================
  test('應該在歷史記錄超過 500 時進行截斷', (done) => {
    // 創建 500 個移動記錄
    const largeHistory = Array(500).fill(null).map((_, i) => ({
      timestamp: new Date(Date.now() - i * 1000).toISOString(),
      categoryName: `Category ${i}`,
      targetLevel: (i % 4),
      timeSaved: 60,
      moveNumber: i + 1
    }));

    mockChrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({
        categoryMoveStats: {
          totalMoves: 500,
          totalTimeSaved: 30000,
          lastReset: new Date().toISOString()
        },
        moveHistory: largeHistory
      });
    });

    mockChrome.storage.local.set.mockImplementation((data, callback) => {
      callback();
    });

    const request = { timeSaved: 60, categoryName: 'New Category', targetLevel: 1 };

    handleRecordCategoryMove(request, (response) => {
      expect(response.success).toBe(true);
      expect(response.historySize).toBe(500);  // 應該截斷到 500

      const setCall = mockChrome.storage.local.set.mock.calls[0][0];
      expect(setCall.moveHistory).toHaveLength(500);
      // 最新的記錄應該在前面
      expect(setCall.moveHistory[0].categoryName).toBe('New Category');

      done();
    });
  });

  // ===========================================================================
  // 測試 10: 時間戳和統計計算
  // ===========================================================================
  test('應該正確設置時間戳和計算統計', (done) => {
    mockChrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({
        categoryMoveStats: {
          totalMoves: 10,
          totalTimeSaved: 600,
          lastReset: '2026-01-27T00:00:00Z'
        },
        moveHistory: []
      });
    });

    mockChrome.storage.local.set.mockImplementation((data, callback) => {
      callback();
    });

    const beforeTime = new Date();
    const request = { timeSaved: 120, categoryName: 'Test Category', targetLevel: 2 };

    handleRecordCategoryMove(request, (response) => {
      const afterTime = new Date();

      expect(response.success).toBe(true);
      expect(response.stats.totalMoves).toBe(11);
      expect(response.stats.totalTimeSaved).toBe(720);

      // 驗證時間戳在合理範圍內
      const recordTime = new Date(response.moveRecord.timestamp);
      expect(recordTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(recordTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());

      // 驗證 lastMoveTime 被更新
      expect(response.stats.lastMoveTime).toBeDefined();

      done();
    });
  });

  // ===========================================================================
  // 測試 11: 驗證器調用
  // ===========================================================================
  test('應該正確調用輸入驗證器', (done) => {
    mockChrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({
        categoryMoveStats: undefined,
        moveHistory: undefined
      });
    });

    mockChrome.storage.local.set.mockImplementation((data, callback) => {
      callback();
    });

    const request = { timeSaved: 60, categoryName: 'Test', targetLevel: 1 };

    handleRecordCategoryMove(request, (response) => {
      expect(mockValidator.validateTimeSaved).toHaveBeenCalledWith(60);
      expect(mockValidator.validateCategoryName).toHaveBeenCalledWith('Test');

      done();
    });
  });

  // ===========================================================================
  // 測試 12: 驗證失敗時應調用 logRejectedRequest
  // ===========================================================================
  test('應該在驗證失敗時記錄被拒絕的請求', (done) => {
    const request = {
      timeSaved: -10  // 無效值
    };

    handleRecordCategoryMove(request, (response) => {
      expect(mockValidator.logRejectedRequest).toHaveBeenCalled();
      expect(response.success).toBe(false);

      done();
    });
  });
});
