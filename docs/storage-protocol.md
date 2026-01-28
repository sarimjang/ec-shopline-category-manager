# Storage Message Protocol (Phase 2.1)

## 概述

Phase 2.1 實現了在 `init.js` 中的 chrome.storage 操作消息處理器，建立了 content script 與 service worker 之間的通信協議。

## 架構

```
┌──────────────────────────────────────────────────────────┐
│ Content Script (ISOLATED World)                          │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ content.js (執行業務邏輯)                           │  │
│ │ - 使用 StorageClient 進行存儲操作                   │  │
│ │ - 通過 chrome.runtime.sendMessage 發送請求         │  │
│ └────────────────┬─────────────────────────────────┘  │
│                  │ chrome.runtime.sendMessage()        │
└──────────────────┼──────────────────────────────────────┘
                   │ (跨腳本通信)
┌──────────────────┼──────────────────────────────────────┐
│ Service Worker (Background Context)                      │
│                  │                                      │
│ ┌───────────────▼────────────────────────────────────┐ │
│ │ init.js (儲存消息處理器)                           │ │
│ │ - handleStorageMessage(request, sender, response)│ │
│ │ - registerStorageMessageHandler()                │ │
│ │ - getFromStorage / setInStorage / ...            │ │
│ │ - 直接調用 chrome.storage.local API             │ │
│ └────────────────┬────────────────────────────────┘ │
│                  │ (同一進程)                        │
│                  ▼                                    │
│         ┌─────────────────────┐                      │
│         │ chrome.storage.local│                      │
│         │   (Extension Data)  │                      │
│         └─────────────────────┘                      │
└──────────────────────────────────────────────────────────┘
```

## 消息協議

### Request 格式

```javascript
{
  source: 'scm-storage',           // 必須：消息源識別符
  action: 'get'|'set'|'remove'|'clear',  // 必須：操作類型
  key: string | undefined,         // 可選：存儲鍵（clear 時為 undefined）
  value: any | undefined,          // 可選：存儲值（set 時需要）
  requestId: string               // 必須：請求追蹤 ID
}
```

### Response 格式

```javascript
{
  source: 'scm-storage',           // 消息源識別符
  requestId: string,               // 對應的請求 ID
  success: boolean,                // 操作是否成功
  data: any | undefined,           // 操作結果（如 get 返回的值）
  error: string | undefined        // 錯誤訊息（失敗時存在）
}
```

## 操作詳解

### GET 操作

**用途**：從 chrome.storage.local 獲取值

**Request**：
```javascript
{
  source: 'scm-storage',
  action: 'get',
  key: 'categories',              // 可以是單個鍵或鍵陣列
  requestId: 'storage-req-1234-1'
}
```

**Response (成功)**：
```javascript
{
  source: 'scm-storage',
  requestId: 'storage-req-1234-1',
  success: true,
  data: {
    categories: [...]             // 返回的存儲數據
  }
}
```

**Response (失敗)**：
```javascript
{
  source: 'scm-storage',
  requestId: 'storage-req-1234-1',
  success: false,
  error: 'Key is required for get operation'
}
```

### SET 操作

**用途**：向 chrome.storage.local 設置值

**Request**：
```javascript
{
  source: 'scm-storage',
  action: 'set',
  key: 'categories',
  value: [{id: 1, name: 'Cat1'}, ...],
  requestId: 'storage-req-1234-2'
}
```

**Response (成功)**：
```javascript
{
  source: 'scm-storage',
  requestId: 'storage-req-1234-2',
  success: true,
  data: {
    categories: [...]             // 設置的值
  }
}
```

### REMOVE 操作

**用途**：從 chrome.storage.local 移除值

**Request**：
```javascript
{
  source: 'scm-storage',
  action: 'remove',
  key: 'categories',              // 可以是單個鍵或鍵陣列
  requestId: 'storage-req-1234-3'
}
```

**Response (成功)**：
```javascript
{
  source: 'scm-storage',
  requestId: 'storage-req-1234-3',
  success: true
}
```

### CLEAR 操作

**用途**：清除所有 chrome.storage.local 數據

**Request**：
```javascript
{
  source: 'scm-storage',
  action: 'clear',
  requestId: 'storage-req-1234-4'
}
```

**Response (成功)**：
```javascript
{
  source: 'scm-storage',
  requestId: 'storage-req-1234-4',
  success: true
}
```

## 客户端使用 (StorageClient)

### 初始化

```javascript
// init.js 中自動註冊消息處理器
registerStorageMessageHandler();

// content.js 中使用存儲客户端
const result = await StorageClient.init();
```

### Get 操作

```javascript
// 單個鍵
const data = await StorageClient.get('categories');
console.log(data.categories);

// 多個鍵
const data = await StorageClient.get(['categories', 'stats']);
console.log(data.categories, data.stats);
```

### Set 操作

```javascript
await StorageClient.set('categories', [
  { id: 1, name: 'Cat1' },
  { id: 2, name: 'Cat2' }
]);
```

### Remove 操作

```javascript
// 單個鍵
await StorageClient.remove('categories');

// 多個鍵
await StorageClient.remove(['categories', 'stats']);
```

### Clear 操作

```javascript
// 清除所有數據
await StorageClient.clear();
```

## 錯誤處理

### 客户端側

```javascript
try {
  const data = await StorageClient.get('categories');
} catch (error) {
  console.error('Storage error:', error.message);
  // 處理錯誤：超時、API 錯誤、無效参數等
}
```

### 服務器側 (init.js)

```javascript
async function handleStorageMessage(request, sender, sendResponse) {
  try {
    // 驗證消息源
    if (request.source !== 'scm-storage') {
      return false;  // 忽略無效消息
    }

    // 驗證參數
    if (!request.key && request.action !== 'clear') {
      throw new Error('Key is required for this operation');
    }

    // 執行存儲操作並回應
    const data = await getFromStorage(request.key);
    sendResponse({
      source: 'scm-storage',
      requestId: request.requestId,
      success: true,
      data
    });
  } catch (error) {
    // 錯誤回應
    sendResponse({
      source: 'scm-storage',
      requestId: request.requestId,
      success: false,
      error: error.message
    });
  }

  return true;  // 支援異步回應
}
```

## 超時與重試

### 超時機制

- **默認超時**：5000 ms (5 秒)
- **觸發**：未收到服務器回應時

```javascript
// StorageClient 中實現
function sendStorageMessage(action, key, value) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Storage ${action} operation timeout`));
    }, 5000);

    chrome.runtime.sendMessage(message, (response) => {
      clearTimeout(timeout);
      // ... 處理回應
    });
  });
}
```

### 重試策略

建議在 content.js 中實現重試邏輯：

```javascript
async function storageGetWithRetry(key, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await StorageClient.get(key);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, 100 * attempt));
    }
  }
}
```

## 安全性考慮

### 1. 消息源驗證

所有存儲消息必須帶有 `source: 'scm-storage'` 標識，防止其他腳本注入假消息。

```javascript
if (request.source !== 'scm-storage') {
  console.warn('Invalid message source:', request.source);
  return false;
}
```

### 2. 參數驗證

- **Get/Remove**：必須提供 key
- **Set**：必須提供 key 和 value
- **Clear**：無需參數，但應驗證操作意圖

```javascript
if (request.action === 'get' && !request.key) {
  throw new Error('Key is required for get operation');
}
```

### 3. 請求追蹤

每個請求帶有唯一的 `requestId`，便於：
- 追蹤異步操作
- 防止請求混淆
- 超時檢測

```javascript
function generateRequestId() {
  return `storage-req-${Date.now()}-${++requestCounter}`;
}
```

## 與其他模塊的集成

### 與 StorageManager 的關係

```javascript
// Phase 1.3 中的 StorageManager 現在可以使用 StorageClient
class StorageManager {
  async addMove(timeSaved) {
    const stats = await StorageClient.get('stats');
    stats.totalTimeSaved += timeSaved;
    await StorageClient.set('stats', stats);
    return stats;
  }
}
```

### 替換 localStorage

之前依賴 localStorage 的代碼現在使用 chrome.storage.local：

```javascript
// 舊代碼
const categories = JSON.parse(localStorage.getItem('categories'));

// 新代碼
const { categories } = await StorageClient.get('categories');
```

## 測試覆蓋

### 單元測試 (`tests/unit/storage-handlers.test.js`)
- 消息源驗證
- 各操作類型的正確處理
- 參數驗證和錯誤處理
- 異步回應支持

### 集成測試 (`tests/integration/storage-client-integration.test.js`)
- StorageClient 初始化
- 完整的 Get/Set/Remove/Clear 流程
- 超時和錯誤傳播
- 請求 ID 追蹤

## 性能考慮

### 批量操作

```javascript
// 不推薦：多次往返
await StorageClient.set('key1', value1);
await StorageClient.set('key2', value2);
await StorageClient.set('key3', value3);

// 推薦：單次批量操作
// (如果需要支持，可擴展協議)
```

### 大型數據

- Chrome storage.local 限制：10MB
- 建議將大型數據分片存儲
- 監控存儲空間使用

```javascript
// 可在未來實現
async function getStorageUsage() {
  // ... 返回已用/剩餘容量
}
```

## 故障排除

### 常見問題

**Q: 收到超時錯誤**
- 檢查 service worker 是否正在運行
- 檢查 init.js 中是否正確註冊消息處理器
- 查看 console 日誌中的錯誤信息

**Q: 返回未定義的值**
- 驗證鍵是否存在
- 檢查數據是否被正確設置
- 使用 StorageClient.get('key') 而非 get(undefined)

**Q: 存儲限制警告**
- 監控已用容量（當前未實現 API）
- 清理舊數據
- 考慮分片存儲

## 未來改進

1. **批量操作**：支持單個請求中的多個操作
2. **存儲配額監控**：添加 getQuota() 方法
3. **變更監聽**：支持 onChanged 事件
4. **加密**：敏感數據加密存儲
5. **版本控制**：支持數據遷移和版本化

## 參考資源

- [Chrome Storage API 文檔](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [Chrome Message Passing](https://developer.chrome.com/docs/extensions/mv3/messaging/)
- [Content Scripts 安全性](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)
