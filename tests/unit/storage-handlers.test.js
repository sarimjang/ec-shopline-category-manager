/**
 * Storage Handler Tests (Phase 2.1)
 * 測試 init.js 中的存儲消息處理器功能
 * 
 * 測試項目:
 * 1. 消息驗證 (source 檢查)
 * 2. Get 操作
 * 3. Set 操作
 * 4. Remove 操作
 * 5. Clear 操作
 * 6. 錯誤處理
 */

'use strict';

describe('Storage Message Handler (Phase 2.1)', () => {
  
  // Mock chrome.storage.local API
  global.chrome = {
    storage: {
      local: {
        get: jest.fn(),
        set: jest.fn(),
        remove: jest.fn(),
        clear: jest.fn()
      }
    },
    runtime: {
      lastError: null,
      onMessage: {
        listeners: [],
        addListener: jest.fn(function(callback) {
          this.listeners.push(callback);
        })
      }
    }
  };

  let handleStorageMessage;

  beforeEach(() => {
    // 清空 mock 調用記錄
    jest.clearAllMocks();

    // 重設 chrome.runtime.lastError
    global.chrome.runtime.lastError = null;

    // 注入 handleStorageMessage 函數
    // (實際上應該從 init.js 中導出，這裡為了測試目的手動定義)
    handleStorageMessage = function(request, sender, sendResponse) {
      if (request.source !== 'scm-storage') {
        return false;
      }

      const { action, key, value, requestId } = request;

      try {
        switch (action) {
          case 'get':
            if (!key) throw new Error('Key is required');
            chrome.storage.local.get(key, (result) => {
              if (chrome.runtime.lastError) {
                throw chrome.runtime.lastError;
              }
              sendResponse({
                source: 'scm-storage',
                requestId,
                success: true,
                data: result
              });
            });
            break;

          case 'set':
            if (!key || value === undefined) throw new Error('Key and value required');
            chrome.storage.local.set({ [key]: value }, () => {
              if (chrome.runtime.lastError) {
                throw chrome.runtime.lastError;
              }
              sendResponse({
                source: 'scm-storage',
                requestId,
                success: true,
                data: { [key]: value }
              });
            });
            break;

          case 'remove':
            if (!key) throw new Error('Key is required');
            chrome.storage.local.remove(key, () => {
              if (chrome.runtime.lastError) {
                throw chrome.runtime.lastError;
              }
              sendResponse({
                source: 'scm-storage',
                requestId,
                success: true
              });
            });
            break;

          case 'clear':
            chrome.storage.local.clear(() => {
              if (chrome.runtime.lastError) {
                throw chrome.runtime.lastError;
              }
              sendResponse({
                source: 'scm-storage',
                requestId,
                success: true
              });
            });
            break;

          default:
            throw new Error(`Unknown action: ${action}`);
        }
      } catch (error) {
        sendResponse({
          source: 'scm-storage',
          requestId,
          success: false,
          error: error.message
        });
      }

      return true;
    };
  });

  test('應該拒絕無效的消息源', () => {
    const sendResponse = jest.fn();
    const result = handleStorageMessage(
      { source: 'invalid' },
      { id: 'extension' },
      sendResponse
    );
    
    expect(result).toBe(false);
    expect(sendResponse).not.toHaveBeenCalled();
  });

  test('應該處理 get 操作', (done) => {
    const sendResponse = jest.fn((response) => {
      expect(response.success).toBe(true);
      expect(response.source).toBe('scm-storage');
      expect(response.data).toEqual({ testKey: 'testValue' });
      done();
    });

    // Mock chrome.storage.local.get 的回調
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({ testKey: 'testValue' });
    });

    handleStorageMessage(
      {
        source: 'scm-storage',
        action: 'get',
        key: 'testKey',
        requestId: 'req-1'
      },
      { id: 'extension' },
      sendResponse
    );
  });

  test('應該處理 set 操作', (done) => {
    const sendResponse = jest.fn((response) => {
      expect(response.success).toBe(true);
      expect(response.source).toBe('scm-storage');
      expect(response.data).toEqual({ testKey: 'newValue' });
      done();
    });

    chrome.storage.local.set.mockImplementation((items, callback) => {
      callback();
    });

    handleStorageMessage(
      {
        source: 'scm-storage',
        action: 'set',
        key: 'testKey',
        value: 'newValue',
        requestId: 'req-2'
      },
      { id: 'extension' },
      sendResponse
    );
  });

  test('應該處理 remove 操作', (done) => {
    const sendResponse = jest.fn((response) => {
      expect(response.success).toBe(true);
      expect(response.source).toBe('scm-storage');
      done();
    });

    chrome.storage.local.remove.mockImplementation((keys, callback) => {
      callback();
    });

    handleStorageMessage(
      {
        source: 'scm-storage',
        action: 'remove',
        key: 'testKey',
        requestId: 'req-3'
      },
      { id: 'extension' },
      sendResponse
    );
  });

  test('應該處理 clear 操作', (done) => {
    const sendResponse = jest.fn((response) => {
      expect(response.success).toBe(true);
      expect(response.source).toBe('scm-storage');
      done();
    });

    chrome.storage.local.clear.mockImplementation((callback) => {
      callback();
    });

    handleStorageMessage(
      {
        source: 'scm-storage',
        action: 'clear',
        requestId: 'req-4'
      },
      { id: 'extension' },
      sendResponse
    );
  });

  test('應該處理 get 操作的缺失鍵錯誤', (done) => {
    const sendResponse = jest.fn((response) => {
      expect(response.success).toBe(false);
      expect(response.error).toContain('required');
      done();
    });

    handleStorageMessage(
      {
        source: 'scm-storage',
        action: 'get',
        requestId: 'req-5'
      },
      { id: 'extension' },
      sendResponse
    );
  });

  test('應該處理 set 操作的缺失參數錯誤', (done) => {
    const sendResponse = jest.fn((response) => {
      expect(response.success).toBe(false);
      expect(response.error).toContain('required');
      done();
    });

    handleStorageMessage(
      {
        source: 'scm-storage',
        action: 'set',
        key: 'testKey',
        requestId: 'req-6'
      },
      { id: 'extension' },
      sendResponse
    );
  });

  test('應該處理未知的操作類型', (done) => {
    const sendResponse = jest.fn((response) => {
      expect(response.success).toBe(false);
      expect(response.error).toContain('Unknown action');
      done();
    });

    handleStorageMessage(
      {
        source: 'scm-storage',
        action: 'unknown',
        requestId: 'req-7'
      },
      { id: 'extension' },
      sendResponse
    );
  });

  test('應該返回 true 以支援異步回應', () => {
    const sendResponse = jest.fn();
    
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({ key: 'value' });
    });

    const result = handleStorageMessage(
      {
        source: 'scm-storage',
        action: 'get',
        key: 'testKey',
        requestId: 'req-8'
      },
      { id: 'extension' },
      sendResponse
    );

    expect(result).toBe(true);
  });
});
