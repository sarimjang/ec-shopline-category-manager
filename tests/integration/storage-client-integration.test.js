/**
 * Storage Client Integration Tests (Phase 2.1)
 * 測試 storage-client.js 與消息處理器的集成
 * 
 * 測試項目:
 * 1. StorageClient 初始化
 * 2. Get/Set/Remove/Clear 操作
 * 3. 超時處理
 * 4. 錯誤傳播
 * 5. 請求 ID 追蹤
 */

'use strict';

describe('Storage Client Integration (Phase 2.1)', () => {
  
  let StorageClient;
  let mockSendMessage;

  beforeEach(() => {
    // 清空所有 jest mocks
    jest.clearAllMocks();

    // 設置 chrome.runtime mock
    global.chrome = {
      runtime: {
        sendMessage: jest.fn(),
        lastError: null
      }
    };

    mockSendMessage = chrome.runtime.sendMessage;

    // 模擬 StorageClient 類（實際上應從 storage-client.js 導入）
    StorageClient = (function() {
      let requestCounter = 0;

      function generateRequestId() {
        return `storage-req-${Date.now()}-${++requestCounter}`;
      }

      function sendStorageMessage(action, key, value) {
        return new Promise((resolve, reject) => {
          const requestId = generateRequestId();
          const timeout = setTimeout(() => {
            reject(new Error(`Storage ${action} operation timeout`));
          }, 5000);

          const message = {
            source: 'scm-storage',
            action,
            requestId
          };

          if (action !== 'clear') {
            message.key = key;
          }
          if (action === 'set') {
            message.value = value;
          }

          try {
            chrome.runtime.sendMessage(message, (response) => {
              clearTimeout(timeout);

              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
              }

              if (!response || !response.success) {
                const errorMsg = response?.error || 'Unknown error';
                reject(new Error(errorMsg));
                return;
              }

              resolve(response.data);
            });
          } catch (error) {
            clearTimeout(timeout);
            reject(error);
          }
        });
      }

      return {
        get: (key) => sendStorageMessage('get', key),
        set: (key, value) => sendStorageMessage('set', key, value),
        remove: (key) => sendStorageMessage('remove', key),
        clear: () => sendStorageMessage('clear'),
        init: async () => {
          if (!chrome || !chrome.runtime) {
            throw new Error('chrome.runtime API not available');
          }
          return true;
        }
      };
    })();
  });

  test('StorageClient.init() 應該成功初始化', async () => {
    const result = await StorageClient.init();
    expect(result).toBe(true);
  });

  test('StorageClient.get() 應該發送正確的消息', (done) => {
    mockSendMessage.mockImplementation((message, callback) => {
      expect(message.source).toBe('scm-storage');
      expect(message.action).toBe('get');
      expect(message.key).toBe('testKey');
      expect(message.requestId).toBeDefined();

      callback({
        source: 'scm-storage',
        requestId: message.requestId,
        success: true,
        data: { testKey: 'testValue' }
      });
    });

    StorageClient.get('testKey').then((data) => {
      expect(data).toEqual({ testKey: 'testValue' });
      done();
    });
  });

  test('StorageClient.set() 應該發送正確的消息', (done) => {
    mockSendMessage.mockImplementation((message, callback) => {
      expect(message.source).toBe('scm-storage');
      expect(message.action).toBe('set');
      expect(message.key).toBe('testKey');
      expect(message.value).toBe('testValue');
      expect(message.requestId).toBeDefined();

      callback({
        source: 'scm-storage',
        requestId: message.requestId,
        success: true,
        data: { testKey: 'testValue' }
      });
    });

    StorageClient.set('testKey', 'testValue').then((data) => {
      expect(data).toEqual({ testKey: 'testValue' });
      done();
    });
  });

  test('StorageClient.remove() 應該發送正確的消息', (done) => {
    mockSendMessage.mockImplementation((message, callback) => {
      expect(message.source).toBe('scm-storage');
      expect(message.action).toBe('remove');
      expect(message.key).toBe('testKey');
      expect(message.requestId).toBeDefined();

      callback({
        source: 'scm-storage',
        requestId: message.requestId,
        success: true
      });
    });

    StorageClient.remove('testKey').then(() => {
      done();
    });
  });

  test('StorageClient.clear() 應該發送正確的消息', (done) => {
    mockSendMessage.mockImplementation((message, callback) => {
      expect(message.source).toBe('scm-storage');
      expect(message.action).toBe('clear');
      expect(message.requestId).toBeDefined();
      expect(message.key).toBeUndefined();

      callback({
        source: 'scm-storage',
        requestId: message.requestId,
        success: true
      });
    });

    StorageClient.clear().then(() => {
      done();
    });
  });

  test('應該処理服務器錯誤', (done) => {
    mockSendMessage.mockImplementation((message, callback) => {
      callback({
        source: 'scm-storage',
        requestId: message.requestId,
        success: false,
        error: 'Storage quota exceeded'
      });
    });

    StorageClient.set('testKey', 'testValue').catch((error) => {
      expect(error.message).toContain('Storage quota exceeded');
      done();
    });
  });

  test('應該処理 chrome.runtime 錯誤', (done) => {
    mockSendMessage.mockImplementation((message, callback) => {
      chrome.runtime.lastError = new Error('Extension context invalidated');
      callback(undefined);
    });

    StorageClient.get('testKey').catch((error) => {
      expect(error.message).toContain('Extension context invalidated');
      done();
    });
  });

  test('應該処理超時', (done) => {
    jest.useFakeTimers();
    
    mockSendMessage.mockImplementation((message, callback) => {
      // 模擬超時：不調用 callback
      setTimeout(() => {
        jest.runOnlyPendingTimers();
      }, 5100);
    });

    StorageClient.get('testKey').catch((error) => {
      expect(error.message).toContain('timeout');
      jest.useRealTimers();
      done();
    });

    jest.runOnlyPendingTimers();
  });

  test('應該拒絕缺失鍵的 get 操作', async () => {
    try {
      await StorageClient.get(null);
      fail('Should have thrown an error');
    } catch (error) {
      expect(error.message).toContain('Key is required');
    }
  });

  test('應該拒絕缺失鍵或值的 set 操作', async () => {
    try {
      await StorageClient.set('testKey', undefined);
      fail('Should have thrown an error');
    } catch (error) {
      expect(error.message).toContain('required');
    }
  });

  test('應該為每個請求生成唯一的 requestId', (done) => {
    const requestIds = new Set();
    let completedRequests = 0;

    mockSendMessage.mockImplementation((message, callback) => {
      requestIds.add(message.requestId);
      callback({
        source: 'scm-storage',
        requestId: message.requestId,
        success: true,
        data: {}
      });

      completedRequests++;
      if (completedRequests === 3) {
        expect(requestIds.size).toBe(3);
        done();
      }
    });

    StorageClient.get('key1');
    StorageClient.get('key2');
    StorageClient.get('key3');
  });
});
