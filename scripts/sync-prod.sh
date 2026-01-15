#!/bin/bash
# 符號級同步腳本 - 安全地將 dev 版本同步到 prod 版本
# 使用方式: ./scripts/sync-prod.sh

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEV_FILE="$PROJECT_ROOT/src/shopline-category-manager.user.js"
PROD_FILE="$PROJECT_ROOT/src/shopline-category-manager.prod.user.js"

echo "🔄 開始符號級同步..."
echo "  來源: $DEV_FILE"
echo "  目標: $PROD_FILE"

# Step 1: 驗證 dev 版本語法
echo "✓ 驗證來源檔案語法..."
if ! node -e "
  const fs = require('fs');
  const acorn = require('acorn');
  const code = fs.readFileSync('$DEV_FILE', 'utf8');
  try {
    acorn.parse(code, {ecmaVersion: 2022, sourceType: 'script'});
  } catch(e) {
    console.error('❌ 來源檔案語法錯誤:', e.message);
    process.exit(1);
  }
" 2>/dev/null; then
  echo "❌ 來源檔案語法檢查失敗"
  exit 1
fi

# Step 2: 備份 prod 版本
BACKUP_FILE="$PROD_FILE.backup.$(date +%Y%m%d_%H%M%S)"
cp "$PROD_FILE" "$BACKUP_FILE"
echo "✓ 已備份到: $BACKUP_FILE"

# Step 3: 保留 prod metadata（前 16 行）
head -n 16 "$PROD_FILE" > /tmp/prod_metadata.txt

# Step 4: 從 dev 取得程式碼主體（從第 12 行開始，跳過 dev 的 metadata）
tail -n +12 "$DEV_FILE" > /tmp/dev_body.txt

# Step 5: 合併
cat /tmp/prod_metadata.txt /tmp/dev_body.txt > "$PROD_FILE"

# Step 6: 驗證 prod 版本語法
echo "✓ 驗證目標檔案語法..."
if ! node -e "
  const fs = require('fs');
  const acorn = require('acorn');
  const code = fs.readFileSync('$PROD_FILE', 'utf8');
  try {
    acorn.parse(code, {ecmaVersion: 2022, sourceType: 'script'});
    console.log('✅ prod.user.js 語法正確');
  } catch(e) {
    console.error('❌ 同步後語法錯誤 at Line', e.loc?.line, ':', e.message);
    console.log('🔄 恢復備份...');
    fs.copyFileSync('$BACKUP_FILE', '$PROD_FILE');
    process.exit(1);
  }
" 2>/dev/null; then
  echo "❌ 同步失敗，已恢復備份"
  cp "$BACKUP_FILE" "$PROD_FILE"
  exit 1
fi

# Step 7: 比較行數
DEV_LINES=$(wc -l < "$DEV_FILE" | tr -d ' ')
PROD_LINES=$(wc -l < "$PROD_FILE" | tr -d ' ')

echo ""
echo "📊 同步結果："
echo "  dev.user.js:  $DEV_LINES 行"
echo "  prod.user.js: $PROD_LINES 行"
echo "  差異: $((PROD_LINES - DEV_LINES + 11 - 16)) 行 (metadata 長度差異)"
echo ""
echo "✅ 同步完成！"
echo "💡 備份保留在: $BACKUP_FILE"
echo "   如需還原: cp \"$BACKUP_FILE\" \"$PROD_FILE\""

# 清理臨時檔案
rm -f /tmp/prod_metadata.txt /tmp/dev_body.txt
