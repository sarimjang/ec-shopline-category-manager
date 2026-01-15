#!/usr/bin/env node

/**
 * 最小化 Shopline Category Manager 腳本
 * 使用 Terser 減少 ~45% 檔案大小
 * 保留元數據區塊和 console.error 語句用於除錯
 */

const fs = require('fs');
const path = require('path');
const Terser = require('terser');

const SOURCE_FILE = path.join(__dirname, '../src/shopline-category-manager.prod.user.js');
const OUTPUT_FILE = path.join(__dirname, '../src/shopline-category-manager.min.user.js');

async function minifyScript() {
  try {
    // 讀取原始檔案
    const code = fs.readFileSync(SOURCE_FILE, 'utf-8');

    // 分離元數據區塊（UserScript header）和代碼
    const headerMatch = code.match(/^\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==\n/);
    const header = headerMatch ? headerMatch[0] : '';
    const scriptCode = code.substring(header.length);

    // 設定 Terser 選項（2 次壓縮通過）
    const options = {
      compress: {
        passes: 2,
        drop_console: false, // 保留 console 語句以保存 console.error
        pure_funcs: null, // 防止删除可能有副作用的函數
      },
      mangle: {
        properties: true,
        reserved: ['$', 'jQuery'], // 保留常見的全域變數
      },
      output: {
        beautify: false,
        comments: false, // 移除所有註釋
      },
    };

    // 最小化代碼
    console.log(`📦 正在最小化 ${SOURCE_FILE}...`);
    const result = await Terser.minify(scriptCode, options);

    if (result.error) {
      throw new Error(`Terser 錯誤: ${result.error.message}`);
    }

    // 更新元數據中的版本標記
    const updatedHeader = header.replace(
      /\/\/ @name\s+(.+)/,
      '// @name         $1 (Optimized)'
    );

    // 組合元數據和最小化代碼
    const minifiedCode = updatedHeader + result.code;

    // 寫入最小化檔案
    fs.writeFileSync(OUTPUT_FILE, minifiedCode, 'utf-8');

    // 計算大小縮減
    const originalSize = code.length;
    const minifiedSize = minifiedCode.length;
    const reduction = ((1 - minifiedSize / originalSize) * 100).toFixed(2);

    console.log(`✅ 最小化完成！`);
    console.log(`   原始大小: ${(originalSize / 1024).toFixed(2)} KB`);
    console.log(`   最小化大小: ${(minifiedSize / 1024).toFixed(2)} KB`);
    console.log(`   縮減比例: ${reduction}%`);
    console.log(`   輸出: ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('❌ 最小化失敗:', error.message);
    process.exit(1);
  }
}

minifyScript();
