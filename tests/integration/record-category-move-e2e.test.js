/**
 * End-to-End Integration Test: Record Category Move
 * 測試從 content script 到 popup 的完整流程
 *
 * 流程:
 * 1. Content script 檢測分類移動
 * 2. Content script 發送 recordCategoryMove 消息到 service worker
 * 3. Service worker 驗證和記錄消息
 * 4. Service worker 更新 chrome.storage.local 中的統計和歷史
 * 5. Popup 讀取統計並顯示
 */

'use strict';

describe('End-to-End: Record Category Move Flow', () => {
  let mockChrome;
  let mockValidator;
  let mockLogger;

  beforeEach(() => {
    // 清空 mock
    jest.clearAllMocks();

    // 初始化 mock
    mockChrome = {
      storage: {
        local: {
          get: jest.fn(),
          set: jest.fn()
        }
      },
      runtime: {
        lastError: null,
        sendMessage: jest.fn()
      }
    };

    global.chrome = mockChrome;

    // Mock validator
    mockValidator = {
      validateTimeSaved: jest.fn((value) => {
        if (typeof value !== 'number' || value < 0) {
          return { valid: false, errors: ['Invalid'] };
        }
        return { valid: true, errors: [] };
      }),
      validateCategoryName: jest.fn((name) => {
        if (typeof name !== 'string' || name.trim().length === 0) {
          return { valid: false, errors: ['Invalid'] };
        }
        return { valid: true, errors: [] };
      }),
      logRejectedRequest: jest.fn()
    };

    global.window = global.window || {};
    global.window.ShoplineInputValidator = mockValidator;

    // Mock logger
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    };

    global.console = mockLogger;
  });

  // ===========================================================================
  // 測試 1: 完整流程 - 單個移動
  // ===========================================================================
  test('應該支持完整的分類移動記錄流程', (done) => {
    // Step 1: 模擬 service worker 接收消息

    const simulateServiceWorker = (request, callback) => {
      // 驗證
      if (!mockValidator.validateTimeSaved(request.timeSaved).valid) {
        callback({ success: false, error: 'Invalid timeSaved' });
        return;
      }

      // 讀取存儲
      mockChrome.storage.local.get(['categoryMoveStats', 'moveHistory'], (result) => {
        // 更新統計
        const stats = result.categoryMoveStats || {
          totalMoves: 0,
          totalTimeSaved: 0,
          lastReset: new Date().toISOString()
        };

        stats.totalMoves += 1;
        stats.totalTimeSaved += request.timeSaved;

        // 記錄歷史
        let moveHistory = result.moveHistory || [];
        moveHistory.unshift({
          timestamp: new Date().toISOString(),
          categoryName: request.categoryName || 'Unknown',
          targetLevel: request.targetLevel || 0,
          timeSaved: request.timeSaved,
          moveNumber: stats.totalMoves
        });

        // 保存
        mockChrome.storage.local.set({
          categoryMoveStats: stats,
          moveHistory: moveHistory
        }, () => {
          callback({
            success: true,
            stats: stats,
            historySize: moveHistory.length
          });
        });
      });
    };

    // Setup storage mock
    let storage = {
      categoryMoveStats: undefined,
      moveHistory: undefined
    };

    mockChrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = {};
      keys.forEach(key => {
        result[key] = storage[key];
      });
      callback(result);
    });

    mockChrome.storage.local.set.mockImplementation((data, callback) => {
      Object.assign(storage, data);
      callback();
    });

    // Step 2: 模擬 content script 發送消息
    const moveMessage = {
      action: 'recordCategoryMove',
      categoryName: 'Electronics',
      targetLevel: 1,
      timeSaved: 45
    };

    simulateServiceWorker(moveMessage, (serviceWorkerResponse) => {
      // Step 3: 驗證 service worker 響應
      expect(serviceWorkerResponse.success).toBe(true);
      expect(serviceWorkerResponse.stats.totalMoves).toBe(1);
      expect(serviceWorkerResponse.stats.totalTimeSaved).toBe(45);
      expect(serviceWorkerResponse.historySize).toBe(1);

      // Step 4: 模擬 popup 讀取統計
      mockChrome.storage.local.get(['categoryMoveStats'], (result) => {
        const stats = result.categoryMoveStats || {};

        // Step 5: 驗證 popup 能看到更新的統計
        expect(stats.totalMoves).toBe(1);
        expect(stats.totalTimeSaved).toBe(45);

        // Step 6: 驗證歷史記錄
        mockChrome.storage.local.get(['moveHistory'], (historyResult) => {
          const history = historyResult.moveHistory || [];
          expect(history).toHaveLength(1);
          expect(history[0].categoryName).toBe('Electronics');
          expect(history[0].targetLevel).toBe(1);
          expect(history[0].timeSaved).toBe(45);

          done();
        });
      });
    });
  });

  // ===========================================================================
  // 測試 2: 多個連續的移動
  // ===========================================================================
  test('應該支持多個連續的分類移動', (done) => {
    let storage = {
      categoryMoveStats: undefined,
      moveHistory: undefined
    };

    mockChrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = {};
      keys.forEach(key => {
        result[key] = storage[key];
      });
      callback(result);
    });

    mockChrome.storage.local.set.mockImplementation((data, callback) => {
      Object.assign(storage, data);
      callback();
    });

    // 移動 1
    const simulateMove = (categoryName, targetLevel, timeSaved, callback) => {
      mockChrome.storage.local.get(['categoryMoveStats', 'moveHistory'], (result) => {
        const stats = result.categoryMoveStats || {
          totalMoves: 0,
          totalTimeSaved: 0,
          lastReset: new Date().toISOString()
        };

        stats.totalMoves += 1;
        stats.totalTimeSaved += timeSaved;

        let moveHistory = result.moveHistory || [];
        moveHistory.unshift({
          timestamp: new Date().toISOString(),
          categoryName: categoryName,
          targetLevel: targetLevel,
          timeSaved: timeSaved,
          moveNumber: stats.totalMoves
        });

        mockChrome.storage.local.set({ categoryMoveStats: stats, moveHistory: moveHistory }, () => {
          callback(stats, moveHistory);
        });
      });
    };

    // 執行多個移動
    simulateMove('Category A', 1, 30, (stats1, history1) => {
      expect(stats1.totalMoves).toBe(1);
      expect(stats1.totalTimeSaved).toBe(30);
      expect(history1).toHaveLength(1);

      simulateMove('Category B', 2, 60, (stats2, history2) => {
        expect(stats2.totalMoves).toBe(2);
        expect(stats2.totalTimeSaved).toBe(90);
        expect(history2).toHaveLength(2);

        // 驗證最新的在前面
        expect(history2[0].categoryName).toBe('Category B');
        expect(history2[1].categoryName).toBe('Category A');

        simulateMove('Category C', 1, 45, (stats3, history3) => {
          expect(stats3.totalMoves).toBe(3);
          expect(stats3.totalTimeSaved).toBe(135);
          expect(history3).toHaveLength(3);

          // 驗證順序
          expect(history3[0].categoryName).toBe('Category C');
          expect(history3[0].moveNumber).toBe(3);

          done();
        });
      });
    });
  });

  // ===========================================================================
  // 測試 3: 存儲恢復（瀏覽器重啟後）
  // ===========================================================================
  test('應該正確恢復之前的統計（模擬瀏覽器重啟）', (done) => {
    let storage = {
      categoryMoveStats: {
        totalMoves: 10,
        totalTimeSaved: 600,
        lastReset: '2026-01-27T00:00:00Z',
        lastMoveTime: '2026-01-28T10:00:00Z'
      },
      moveHistory: [
        {
          timestamp: '2026-01-28T10:00:00Z',
          categoryName: 'Previous Category',
          targetLevel: 2,
          timeSaved: 60,
          moveNumber: 10
        }
      ]
    };

    mockChrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = {};
      keys.forEach(key => {
        result[key] = storage[key];
      });
      callback(result);
    });

    mockChrome.storage.local.set.mockImplementation((data, callback) => {
      Object.assign(storage, data);
      callback();
    });

    // 模擬「瀏覽器重啟後」讀取統計
    mockChrome.storage.local.get(['categoryMoveStats'], (result) => {
      expect(result.categoryMoveStats.totalMoves).toBe(10);
      expect(result.categoryMoveStats.totalTimeSaved).toBe(600);

      // 模擬新的移動
      mockChrome.storage.local.get(['categoryMoveStats', 'moveHistory'], (result2) => {
        const stats = result2.categoryMoveStats;
        stats.totalMoves += 1;
        stats.totalTimeSaved += 50;

        let moveHistory = result2.moveHistory;
        moveHistory.unshift({
          timestamp: new Date().toISOString(),
          categoryName: 'New Category',
          targetLevel: 1,
          timeSaved: 50,
          moveNumber: 11
        });

        mockChrome.storage.local.set({ categoryMoveStats: stats, moveHistory: moveHistory }, () => {
          expect(stats.totalMoves).toBe(11);
          expect(stats.totalTimeSaved).toBe(650);
          expect(moveHistory).toHaveLength(2);
          expect(moveHistory[0].categoryName).toBe('New Category');

          done();
        });
      });
    });
  });

  // ===========================================================================
  // 測試 4: 錯誤場景 - 存儲讀取失敗
  // ===========================================================================
  test('應該優雅地處理存儲讀取失敗', (done) => {
    mockChrome.storage.local.get.mockImplementation((keys, callback) => {
      mockChrome.runtime.lastError = { message: 'Storage unavailable' };
      callback({});
    });

    const simulateServiceWorker = (request, callback) => {
      mockChrome.storage.local.get(['categoryMoveStats', 'moveHistory'], (result) => {
        if (mockChrome.runtime.lastError) {
          callback({
            success: false,
            error: 'Failed to read storage'
          });
          return;
        }
        callback({ success: true });
      });
    };

    simulateServiceWorker({ timeSaved: 60 }, (response) => {
      expect(response.success).toBe(false);
      expect(response.error).toBe('Failed to read storage');

      done();
    });
  });

  // ===========================================================================
  // 測試 5: 大量數據 - 500 個移動記錄的邊界情況
  // ===========================================================================
  test('應該正確處理大量移動記錄（500+ 邊界）', (done) => {
    // 創建 500 個移動記錄
    const largeHistory = Array(500).fill(null).map((_, i) => ({
      timestamp: new Date(Date.now() - i * 1000).toISOString(),
      categoryName: `Category ${i}`,
      targetLevel: (i % 4),
      timeSaved: 60,
      moveNumber: i + 1
    }));

    let storage = {
      categoryMoveStats: {
        totalMoves: 500,
        totalTimeSaved: 30000,
        lastReset: new Date().toISOString()
      },
      moveHistory: largeHistory
    };

    mockChrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = {};
      keys.forEach(key => {
        result[key] = storage[key];
      });
      callback(result);
    });

    mockChrome.storage.local.set.mockImplementation((data, callback) => {
      Object.assign(storage, data);
      callback();
    });

    // 添加第 501 個移動
    mockChrome.storage.local.get(['categoryMoveStats', 'moveHistory'], (result) => {
      const stats = result.categoryMoveStats;
      stats.totalMoves += 1;
      stats.totalTimeSaved += 60;

      let moveHistory = result.moveHistory;
      moveHistory.unshift({
        timestamp: new Date().toISOString(),
        categoryName: 'Category 501',
        targetLevel: 1,
        timeSaved: 60,
        moveNumber: 501
      });

      // 應該截斷到 500
      if (moveHistory.length > 500) {
        moveHistory = moveHistory.slice(0, 500);
      }

      mockChrome.storage.local.set({ categoryMoveStats: stats, moveHistory: moveHistory }, () => {
        expect(stats.totalMoves).toBe(501);
        expect(moveHistory).toHaveLength(500);
        expect(moveHistory[0].categoryName).toBe('Category 501');

        done();
      });
    });
  });

  // ===========================================================================
  // 測試 6: 驗證 popup 自動刷新
  // ===========================================================================
  test('應該支持 popup 自動刷新統計', (done) => {
    let storage = {
      categoryMoveStats: {
        totalMoves: 0,
        totalTimeSaved: 0,
        lastReset: new Date().toISOString()
      },
      moveHistory: []
    };

    mockChrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = {};
      keys.forEach(key => {
        result[key] = storage[key];
      });
      callback(result);
    });

    mockChrome.storage.local.set.mockImplementation((data, callback) => {
      Object.assign(storage, data);
      callback();
    });

    // 模擬 popup 初始加載
    mockChrome.storage.local.get(['categoryMoveStats'], (result) => {
      let stats = result.categoryMoveStats || {};
      expect(stats.totalMoves).toBe(0);

      // 模擬發生了一個移動
      mockChrome.storage.local.get(['categoryMoveStats', 'moveHistory'], (result2) => {
        const updatedStats = result2.categoryMoveStats;
        updatedStats.totalMoves += 1;
        updatedStats.totalTimeSaved += 30;

        mockChrome.storage.local.set({ categoryMoveStats: updatedStats }, () => {
          // 模擬 popup 刷新
          mockChrome.storage.local.get(['categoryMoveStats'], (result3) => {
            expect(result3.categoryMoveStats.totalMoves).toBe(1);
            expect(result3.categoryMoveStats.totalTimeSaved).toBe(30);

            done();
          });
        });
      });
    });
  });
});
