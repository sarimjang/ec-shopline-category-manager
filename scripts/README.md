# 開發工具使用指南

## 檔案同步工具

### 為什麼需要符號級同步？

**傳統行號方式的問題**：
```bash
# ❌ 危險：容易破壞程式碼結構
tail -n +17 dev.user.js > prod.user.js
```

**可能導致的問題**：
- ✘ 註解塊被截斷（缺少 `/**` 開頭）
- ✘ 方法被嵌套（插入到其他方法中間）
- ✘ 控制流錯誤（`continue` 脫離迴圈）
- ✘ 語法錯誤（optional chaining 在賦值左側）

---

## 方案 A: AST 級別同步工具（推薦）

### 使用方式

```bash
# 從專案根目錄執行
node scripts/sync-prod-ast.js
```

### 功能特性

✅ **智能 metadata 提取**
- 自動偵測 UserScript header 結束位置
- 保留 prod 版本的 metadata（@updateURL, @downloadURL）
- 僅同步程式碼主體

✅ **語法驗證**
- 同步前驗證來源檔案
- 同步後驗證目標檔案
- 發生錯誤時不寫入檔案

✅ **自動備份**
- 每次同步前自動備份
- 保留最近 5 個備份
- 提供還原指令

✅ **詳細輸出**
```
🔄 開始 AST 級別符號同步...
  來源: shopline-category-manager.user.js
  目標: shopline-category-manager.prod.user.js

✓ 驗證來源檔案語法...
  ✅ 來源檔案語法正確

✓ 已備份到: shopline-category-manager.prod.user.js.backup.2026-01-15T04-44-43

✓ 提取 metadata...
  dev metadata:  12 行
  prod metadata: 17 行

✓ 構建新檔案...

✓ 驗證新檔案語法...
  ✅ 新檔案語法正確

📊 同步結果：
  dev.user.js:  2629 行
  prod.user.js: 2634 行
  差異: 5 行 (metadata 長度差異)

✅ 同步完成！
```

### 還原備份

如果同步後發現問題：

```bash
# 列出所有備份
ls -lt src/*.backup.*

# 還原到指定備份
cp "src/shopline-category-manager.prod.user.js.backup.TIMESTAMP" \
   "src/shopline-category-manager.prod.user.js"
```

---

## 方案 B: 簡易 Shell 腳本

如果不想安裝 Node.js 依賴，可以使用簡化版本：

```bash
./scripts/sync-prod.sh
```

**注意**：這個版本仍使用行號操作，但加入了語法驗證和自動備份。

---

## 開發工作流程

### 1. 修改功能

```bash
# 只修改 dev 版本
vim src/shopline-category-manager.user.js
```

### 2. 測試功能

在瀏覽器中測試 dev 版本，確保功能正常。

### 3. 同步到 prod

```bash
# 使用 AST 工具同步
node scripts/sync-prod-ast.js
```

### 4. 驗證 prod 版本

```bash
# 驗證語法（使用 acorn 解析器）
node -e "
  const fs = require('fs');
  const acorn = require('acorn');
  const code = fs.readFileSync('src/shopline-category-manager.prod.user.js', 'utf8');
  acorn.parse(code, {ecmaVersion: 2022, sourceType: 'script'});
  console.log('✅ 語法正確');
"
```

### 5. 提交變更

```bash
git add src/shopline-category-manager.user.js src/shopline-category-manager.prod.user.js
git commit -m "feat: ..."
```

---

## 使用 Serena MCP 進行符號級操作

如果你在 Claude Code 中工作，可以使用 Serena MCP 工具進行更精確的符號級操作：

### 查找符號

```javascript
// 找到特定方法
find_symbol("CategoryManager/moveCategory")

// 找到所有方法
find_symbol("CategoryManager/*", depth=1)
```

### 替換符號主體

```javascript
// 替換整個方法的實作
replace_symbol_body(
  "CategoryManager/moveCategory",
  "src/shopline-category-manager.user.js",
  "new method body..."
)
```

### 插入新符號

```javascript
// 在某個方法後插入新方法
insert_after_symbol(
  "CategoryManager/initialize",
  "src/shopline-category-manager.user.js",
  "new_method() { ... }"
)
```

### 搜尋程式碼模式

```javascript
// 搜尋特定模式
search_for_pattern(
  "constructor\\(.*?\\)",  // regex 模式
  "src/shopline-category-manager.user.js"
)
```

---

## 最佳實踐

### ✅ DO

1. **總是使用 AST 工具同步**
   ```bash
   node scripts/sync-prod-ast.js
   ```

2. **修改前驗證語法**
   ```bash
   npm install --no-save acorn  # 只安裝一次
   node -e "const acorn = require('acorn'); acorn.parse(require('fs').readFileSync('src/file.js', 'utf8'), {ecmaVersion: 2022})"
   ```

3. **使用符號級工具修改**
   - Serena MCP 的 `find_symbol`, `replace_symbol_body`
   - 避免手動編輯大範圍程式碼

4. **保留備份**
   - 同步工具自動建立備份
   - 手動修改前也應該備份

### ❌ DON'T

1. **不要用行號操作同步**
   ```bash
   # ❌ 危險
   tail -n +17 dev.user.js > prod.user.js
   ```

2. **不要跨方法複製貼上**
   - 容易造成方法嵌套
   - 容易破壞程式碼結構

3. **不要忽略語法錯誤**
   - 即使是小錯誤也會導致腳本無法載入
   - 使用 acorn 解析器驗證語法

4. **不要手動合併衝突**
   - 使用 git 的自動合併
   - 或使用 AST 工具重新同步

---

## 疑難排解

### 問題：同步後語法錯誤

**原因**：metadata 行數計算錯誤

**解決方式**：
```bash
# 檢查 metadata 實際結束位置
grep -n "==/UserScript==" src/shopline-category-manager.user.js
grep -n "==/UserScript==" src/shopline-category-manager.prod.user.js

# 手動調整 sync-prod-ast.js 中的 extractMetadata 函數
```

### 問題：方法被嵌套

**原因**：使用了簡單的行號操作

**解決方式**：
1. 還原到最近的備份
2. 使用 `node scripts/sync-prod-ast.js` 重新同步
3. 使用 Serena MCP 工具逐個方法檢查

### 問題：Optional chaining 語法錯誤

**原因**：`?.` 不能用在賦值左側

**錯誤**：
```javascript
obj?.prop = value;  // ❌
```

**正確**：
```javascript
if (obj) {
  obj.prop = value;  // ✅
}
```

---

## 工具依賴

### Node.js 依賴

```bash
npm install --no-save acorn  # AST 解析器
```

### 系統依賴

- bash (macOS/Linux 內建)
- node (v14+)
- git (版本控制)

---

## 進階技巧

### 批次驗證所有 JS 檔案

```bash
find src -name "*.js" -type f | while read file; do
  echo "檢查 $file..."
  node -e "
    const fs = require('fs');
    const acorn = require('acorn');
    try {
      acorn.parse(fs.readFileSync('$file', 'utf8'), {ecmaVersion: 2022, sourceType: 'script'});
      console.log('  ✅ 正確');
    } catch(e) {
      console.log('  ❌ 錯誤:', e.message);
    }
  "
done
```

### 比較兩個版本的差異（排除 metadata）

```bash
# 只比較程式碼主體
diff -u \
  <(tail -n +12 src/shopline-category-manager.user.js) \
  <(tail -n +17 src/shopline-category-manager.prod.user.js)
```

### 自動同步（git hook）

在 `.git/hooks/pre-commit` 中加入：

```bash
#!/bin/bash
# 自動同步 prod 版本
if git diff --cached --name-only | grep -q "shopline-category-manager.user.js"; then
  echo "🔄 自動同步 prod 版本..."
  node scripts/sync-prod-ast.js
  git add src/shopline-category-manager.prod.user.js
fi
```

---

## 總結

**符號級同步的核心原則**：

1. **永遠驗證語法** - 使用 AST 解析器 (acorn) 而非執行程式碼
2. **保留結構** - 使用 metadata 提取而非固定行號
3. **自動備份** - 每次修改前都建立還原點
4. **清晰輸出** - 讓操作過程透明可追蹤

遵循這些原則，可以避免 99% 的同步相關語法錯誤。
