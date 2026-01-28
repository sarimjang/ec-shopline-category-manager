# Storage Protocol Verification Checklist (Phase 2.1)

## 手動測試清單

此文件用於在實際 Chrome 擴展環境中驗證存儲消息協議的功能。

### 前置條件
1. Chrome 擴展已加載並啟用
2. 目標頁面已導航到 (例如 Shopline admin)
3. 開發者工具已打開 (Console 和 Network 標籤)

---

## Test 1: 消息處理器註冊驗證

### 預期行為
- init.js 應在初始化時註冊存儲消息監聽器
- console 應顯示 "[SCM-Init] Storage message handler registered successfully"

### 驗證步驟
1. 打開頁面開發者工具 Console
2. 查看是否有 "[SCM-Init]" 日誌
3. 搜索 "Storage message handler registered"

### 預期結果
```
[SCM-Init] Registering storage message handler...
[SCM-Init] Storage message handler registered successfully
```

### 驗收標準
- [ ] 日誌中出現註冊成功訊息
- [ ] 無錯誤或警告訊息

---

## Test 2: StorageClient 初始化

### 預期行為
- StorageClient 應在 content.js 加載時可用
- window.StorageClient 應暴露 get/set/remove/clear 方法

### 驗證步驟
1. 在 Console 中執行：
   ```javascript
   window.StorageClient
   ```
2. 檢查返回對象是否包含預期的方法

### 預期結果
```javascript
{
  get: ƒ,
  set: ƒ,
  remove: ƒ,
  clear: ƒ,
  init: ƒ
}
```

### 驗收標準
- [ ] window.StorageClient 存在
- [ ] 包含所有 5 個方法
- [ ] 無型別錯誤

---

## Test 3: GET 操作

### 預期行為
- 發送 GET 請求應返回存儲中的值
- 如果鍵不存在，應返回空物件

### 驗證步驟
1. 首先設置一個測試值：
   ```javascript
   await StorageClient.set('test-key', 'test-value')
   ```
2. 然後讀取它：
   ```javascript
   const result = await StorageClient.get('test-key')
   console.log(result)
   ```
3. 檢查返回值

### 預期結果
```javascript
{ 'test-key': 'test-value' }
```

### 驗收標準
- [ ] Promise 正確 resolve
- [ ] 返回正確的值
- [ ] console 中出現 "Storage get completed" 日誌

---

## Test 4: SET 操作

### 預期行為
- 發送 SET 請求應在存儲中保存值
- 應返回已設置的值

### 驗證步驟
1. 執行：
   ```javascript
   const result = await StorageClient.set('test-key', { data: 'test' })
   console.log(result)
   ```
2. 驗證返回值
3. 驗證存儲是否真的被更新（通過 GET 驗證）

### 預期結果
```javascript
{ 'test-key': { data: 'test' } }
```

### 驗收標準
- [ ] Promise 正確 resolve
- [ ] 返回設置的值
- [ ] 後續 GET 能讀取到該值
- [ ] console 中出現 "Storage set completed" 日誌

---

## Test 5: REMOVE 操作

### 預期行為
- 發送 REMOVE 請求應刪除存儲中的值
- 後續 GET 應返回空物件

### 驗證步驟
1. 設置一個測試值：
   ```javascript
   await StorageClient.set('test-key', 'test-value')
   ```
2. 移除它：
   ```javascript
   await StorageClient.remove('test-key')
   ```
3. 驗證已移除：
   ```javascript
   const result = await StorageClient.get('test-key')
   console.log(result)  // 應該是 {}
   ```

### 預期結果
```javascript
{}
```

### 驗收標準
- [ ] Promise 正確 resolve
- [ ] 後續 GET 返回空物件
- [ ] console 中出現 "Storage remove completed" 日誌

---

## Test 6: CLEAR 操作

### 預期行為
- 發送 CLEAR 請求應清除所有存儲
- 所有後續 GET 應返回空值

### 驗證步驟
1. 設置多個測試值：
   ```javascript
   await StorageClient.set('key1', 'value1')
   await StorageClient.set('key2', 'value2')
   ```
2. 清除所有存儲：
   ```javascript
   await StorageClient.clear()
   ```
3. 驗證存儲已清空：
   ```javascript
   const result = await StorageClient.get('key1')
   console.log(result)  // 應該是 {}
   ```

### 預期結果
```javascript
{}
```

### 驗收標準
- [ ] Promise 正確 resolve
- [ ] 所有後續 GET 返回空值
- [ ] chrome.storage.local 在開發者工具中顯示為空
- [ ] console 中出現 "Storage clear completed" 日誌

---

## Test 7: 錯誤處理 - 缺失鍵

### 預期行為
- GET 操作缺失鍵時應拋出錯誤
- 錯誤訊息應清晰

### 驗證步驟
1. 執行：
   ```javascript
   try {
     await StorageClient.get()
   } catch (error) {
     console.log('Error:', error.message)
   }
   ```
2. 檢查錯誤訊息

### 預期結果
```
Error: Key is required for get operation
```

### 驗收標準
- [ ] 正確拋出錯誤
- [ ] 錯誤訊息清晰
- [ ] console 中出現 "Error:" 日誌

---

## Test 8: 超時處理

### 預期行為
- 如果服務器 5 秒內未回應，應拋出超時錯誤
- （註：此測試需要模擬服務故障，可選）

### 驗證步驟
1. 此測試通常在集成測試中驗證
2. 或者手動停止 service worker 後測試

### 預期結果
```
Error: Storage get operation timeout
```

### 驗收標準
- [ ] 5 秒後拋出超時錯誤（如適用）

---

## Test 9: 消息協議格式驗證

### 預期行為
- 發送的消息應符合協議格式
- 應正確驗證消息源

### 驗證步驟
1. 在 Service Worker Console 中監控消息
2. 執行存儲操作並檢查日誌

### 預期結果
```
[SCM-Storage-Handler] Processing storage get request (storage-req-...)
[SCM-Storage-Handler] Get successful
[SCM-Storage-Handler] Storage get completed (storage-req-...)
```

### 驗收標準
- [ ] 消息包含正確的 source: 'scm-storage'
- [ ] 包含 requestId 便於追蹤
- [ ] 日誌顯示完整的操作流程

---

## Test 10: 與 content.js 的集成

### 預期行為
- content.js 應能透過 StorageClient 訪問存儲
- 現有功能應繼續正常工作

### 驗證步驟
1. 在頁面上執行正常的業務流程
2. 檢查 console 中是否有儲存相關的錯誤
3. 驗證統計數據是否正確保存

### 驗收標準
- [ ] 無存儲相關的錯誤
- [ ] 統計數據正確保存和檢索
- [ ] 功能與之前一致

---

## 故障排除指南

### 問題 1: Storage message handler not registered

**症狀**：Console 中無註冊日誌

**檢查項目**：
- [ ] init.js 是否正確加載
- [ ] Chrome 擴展是否已啟用
- [ ] manifest.json 中是否包含 init.js
- [ ] Service worker 是否正在運行

### 問題 2: chrome.runtime.sendMessage timeout

**症狀**：存儲操作返回超時錯誤

**檢查項目**：
- [ ] Service worker 是否仍在運行（檢查 chrome://extensions）
- [ ] init.js 消息監聽器是否已註冊
- [ ] console 中是否有相關錯誤

### 問題 3: Storage 返回未定義的值

**症狀**：GET 操作返回 {} 而非預期值

**檢查項目**：
- [ ] 值是否已被設置（先執行 SET 操作）
- [ ] 鍵名是否正確拼寫
- [ ] 數據是否被清除（不小心調用 CLEAR）
- [ ] 在 chrome://extensions 中檢查 Storage 選項卡

### 問題 4: Request ID 追蹤

**症狀**：無法追蹤異步操作

**診斷步驟**：
1. 在 Console 中執行操作
2. 記下顯示的 requestId
3. 在 Service Worker Console 中搜索相同的 ID
4. 驗證從發送到回應的完整流程

---

## 性能基准測試

可選：測試存儲操作的性能

```javascript
// 測試單個操作
console.time('storage-get');
await StorageClient.get('test-key');
console.timeEnd('storage-get');

// 測試批量操作
console.time('storage-batch');
for (let i = 0; i < 10; i++) {
  await StorageClient.set(`key-${i}`, `value-${i}`);
}
console.timeEnd('storage-batch');
```

**預期結果**：
- 單個操作：< 100 ms
- 批量 10 個操作：< 1 秒

---

## 完成檢查清單

在完成所有測試後，檢查以下項目：

- [ ] 所有 10 個測試通過
- [ ] 無故障排除問題
- [ ] Console 中無錯誤或警告
- [ ] 性能基准符合預期
- [ ] 與現有功能無衝突

---

## 簽核

- 測試日期：__________
- 測試者：__________
- 結果：[ ] 通過  [ ] 失敗
- 備註：_________________________________

---

## 相關文檔

- 協議規範：docs/storage-protocol.md
- 實現細節：PHASE_2.1_IMPLEMENTATION.md
- 源碼：src/content/init.js, src/content/storage-client.js
- 測試：tests/unit/storage-handlers.test.js, tests/integration/storage-client-integration.test.js
