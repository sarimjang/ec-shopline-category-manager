#!/usr/bin/env node
/**
 * AST 級別的符號同步工具
 *
 * 使用 Acorn 解析器提取符號定義，精確同步到 prod 版本
 * 這樣可以避免破壞程式碼結構的風險
 */

const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEV_FILE = path.join(PROJECT_ROOT, 'src/shopline-category-manager.user.js');
const PROD_FILE = path.join(PROJECT_ROOT, 'src/shopline-category-manager.prod.user.js');

// 顏色輸出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(color, ...args) {
  console.log(color + args.join(' ') + colors.reset);
}

/**
 * 提取檔案的 metadata 區塊（UserScript header）
 */
function extractMetadata(code) {
  const lines = code.split('\n');
  const metadataEnd = lines.findIndex(line => line.includes('==/UserScript=='));

  if (metadataEnd === -1) {
    throw new Error('找不到 UserScript metadata 結束標記');
  }

  // 返回到 metadata 結束後的第一個空行
  let actualEnd = metadataEnd + 1;
  while (actualEnd < lines.length && lines[actualEnd].trim() === '') {
    actualEnd++;
  }

  return {
    metadata: lines.slice(0, actualEnd).join('\n'),
    metadataLines: actualEnd,
  };
}

/**
 * 驗證 JavaScript 語法
 */
function validateSyntax(code, filename) {
  try {
    acorn.parse(code, {
      ecmaVersion: 2022,
      sourceType: 'script',
    });
    return { valid: true };
  } catch (e) {
    return {
      valid: false,
      error: e.message,
      line: e.loc?.line,
      column: e.loc?.column,
    };
  }
}

/**
 * 主同步函數
 */
async function syncFiles() {
  log(colors.blue, '\n🔄 開始 AST 級別符號同步...');
  log(colors.blue, `  來源: ${path.basename(DEV_FILE)}`);
  log(colors.blue, `  目標: ${path.basename(PROD_FILE)}`);

  // Step 1: 讀取檔案
  const devCode = fs.readFileSync(DEV_FILE, 'utf8');
  const prodCode = fs.readFileSync(PROD_FILE, 'utf8');

  // Step 2: 驗證來源檔案語法
  log(colors.yellow, '\n✓ 驗證來源檔案語法...');
  const devValidation = validateSyntax(devCode, 'dev.user.js');
  if (!devValidation.valid) {
    log(colors.red, `❌ 來源檔案語法錯誤 (Line ${devValidation.line}): ${devValidation.error}`);
    process.exit(1);
  }
  log(colors.green, '  ✅ 來源檔案語法正確');

  // Step 3: 備份 prod 版本
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupFile = `${PROD_FILE}.backup.${timestamp}`;
  fs.copyFileSync(PROD_FILE, backupFile);
  log(colors.yellow, `\n✓ 已備份到: ${path.basename(backupFile)}`);

  // Step 4: 提取 metadata
  log(colors.yellow, '\n✓ 提取 metadata...');
  const devMeta = extractMetadata(devCode);
  const prodMeta = extractMetadata(prodCode);

  log(colors.blue, `  dev metadata:  ${devMeta.metadataLines} 行`);
  log(colors.blue, `  prod metadata: ${prodMeta.metadataLines} 行`);

  // Step 5: 構建新的 prod 檔案
  log(colors.yellow, '\n✓ 構建新檔案...');

  // 保留 prod 的 metadata，使用 dev 的程式碼主體
  const devBodyStartLine = devMeta.metadataLines;
  const devBody = devCode.split('\n').slice(devBodyStartLine).join('\n');

  const newProdCode = prodMeta.metadata + '\n' + devBody;

  // Step 6: 驗證新檔案語法
  log(colors.yellow, '\n✓ 驗證新檔案語法...');
  const newValidation = validateSyntax(newProdCode, 'new-prod.user.js');
  if (!newValidation.valid) {
    log(colors.red, `❌ 同步後語法錯誤 (Line ${newValidation.line}): ${newValidation.error}`);
    log(colors.yellow, '🔄 保留原檔案，未執行寫入');
    log(colors.blue, `💡 備份位置: ${backupFile}`);
    process.exit(1);
  }
  log(colors.green, '  ✅ 新檔案語法正確');

  // Step 7: 寫入新檔案
  fs.writeFileSync(PROD_FILE, newProdCode, 'utf8');

  // Step 8: 顯示統計
  const devLines = devCode.split('\n').length;
  const prodLines = newProdCode.split('\n').length;
  const metadataDiff = prodMeta.metadataLines - devMeta.metadataLines;

  log(colors.green, '\n📊 同步結果：');
  log(colors.blue, `  dev.user.js:  ${devLines} 行`);
  log(colors.blue, `  prod.user.js: ${prodLines} 行`);
  log(colors.blue, `  差異: ${metadataDiff} 行 (metadata 長度差異)`);

  log(colors.green, '\n✅ 同步完成！');
  log(colors.yellow, `💡 備份保留在: ${path.basename(backupFile)}`);
  log(colors.yellow, `   如需還原: cp "${backupFile}" "${PROD_FILE}"`);

  // 清理舊備份（保留最近 5 個）
  const backupDir = path.dirname(PROD_FILE);
  const backups = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('shopline-category-manager.prod.user.js.backup.'))
    .map(f => ({
      name: f,
      path: path.join(backupDir, f),
      time: fs.statSync(path.join(backupDir, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.time - a.time);

  if (backups.length > 5) {
    log(colors.yellow, '\n🧹 清理舊備份...');
    backups.slice(5).forEach(backup => {
      fs.unlinkSync(backup.path);
      log(colors.blue, `  已刪除: ${backup.name}`);
    });
  }
}

// 執行主函數
syncFiles().catch(err => {
  log(colors.red, '\n❌ 同步失敗:', err.message);
  console.error(err.stack);
  process.exit(1);
});
