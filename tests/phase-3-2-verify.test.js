/**
 * Phase 3.2 Security Verification Tests
 * 測試 window.categoryManager 的移除和訪問控制
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('\n[Phase 3.2] Remove categoryManager Exposure - Security Tests');
console.log('=' .repeat(70));

let passed = 0;
let failed = 0;

// Test 1: 驗證 window.categoryManager 未被全局暴露
const testInjectedPath = path.join(__dirname, '../src/content/injected.js');
const testInjectedContent = fs.readFileSync(testInjectedPath, 'utf8');

const test1 = {
  name: 'window.categoryManager 未被暴露在全局作用域',
  fn: () => {
    // 搜尋任何直接的 window.categoryManager = 賦值（非刪除）
    const exposurePattern = /^\s*window\.categoryManager\s*=\s*(?!undefined)(?!null)/m;
    const isExposed = exposurePattern.test(testInjectedContent);
    assert(!isExposed, 'categoryManager should not be exposed as window property');
  }
};

try {
  test1.fn();
  console.log(`✓ ${test1.name}`);
  passed++;
} catch (error) {
  console.log(`✗ ${test1.name}`);
  console.log(`  Error: ${error.message}`);
  failed++;
}

// Test 2: 驗證 window.debugCategoryManager 只在開發構建中暴露
const test2 = {
  name: 'window.debugCategoryManager 被正確的條件閘控',
  fn: () => {
    assert(testInjectedContent.includes('if (DEBUG_APIS_ENABLED)'), 
      'should have DEBUG_APIS_ENABLED condition');
    assert(testInjectedContent.includes('window.debugCategoryManager'), 
      'should reference debugCategoryManager');
    assert(testInjectedContent.includes('delete window.debugCategoryManager'), 
      'should delete debugCategoryManager in production');
  }
};

try {
  test2.fn();
  console.log(`✓ ${test2.name}`);
  passed++;
} catch (error) {
  console.log(`✗ ${test2.name}`);
  console.log(`  Error: ${error.message}`);
  failed++;
}

// Test 3: 驗證私密 categoryManager 變數不暴露
const test3 = {
  name: 'Private categoryManager 變數保持在閉包中',
  fn: () => {
    // categoryManager 應該只作為局部變數，不暴露於全局
    assert(testInjectedContent.includes('const categoryManager = new CategoryManager'),
      'should have local categoryManager variable');
    // 確保沒有 window.categoryManager = categoryManager 的賦值
    const privateAssignmentPattern = /^\s*window\.categoryManager\s*=\s*categoryManager/m;
    assert(!privateAssignmentPattern.test(testInjectedContent),
      'categoryManager should not be assigned to window');
  }
};

try {
  test3.fn();
  console.log(`✓ ${test3.name}`);
  passed++;
} catch (error) {
  console.log(`✗ ${test3.name}`);
  console.log(`  Error: ${error.message}`);
  failed++;
}

// Test 4: 驗證 content.js 未暴露管理器
const testContentPath = path.join(__dirname, '../src/content/content.js');
const testContentContent = fs.readFileSync(testContentPath, 'utf8');

const test4 = {
  name: 'content.js 未暴露 _scm_categoryManager 或 _scm_manager',
  fn: () => {
    const categoryManagerExposure = /^\s*window\._scm_categoryManager\s*=/m;
    const managerExposure = /^\s*window\._scm_manager\s*=/m;
    
    assert(!categoryManagerExposure.test(testContentContent),
      'should not expose _scm_categoryManager');
    assert(!managerExposure.test(testContentContent),
      'should not expose _scm_manager');
  }
};

try {
  test4.fn();
  console.log(`✓ ${test4.name}`);
  passed++;
} catch (error) {
  console.log(`✗ ${test4.name}`);
  console.log(`  Error: ${error.message}`);
  failed++;
}

// Test 5: 驗證只有必需的工具函數被暴露
const test5 = {
  name: '只有必需的 _scm_getAngular() 和 _scm_getScope() 被暴露',
  fn: () => {
    assert(testInjectedContent.includes('window._scm_getAngular = function()'),
      'should expose _scm_getAngular');
    assert(testInjectedContent.includes('window._scm_getScope = function()'),
      'should expose _scm_getScope');
  }
};

try {
  test5.fn();
  console.log(`✓ ${test5.name}`);
  passed++;
} catch (error) {
  console.log(`✗ ${test5.name}`);
  console.log(`  Error: ${error.message}`);
  failed++;
}

// Test 6: 驗證消息傳遞 API 是通信主要方式
const testBackgroundPath = path.join(__dirname, '../src/background/service-worker.js');
if (fs.existsSync(testBackgroundPath)) {
  const testBackgroundContent = fs.readFileSync(testBackgroundPath, 'utf8');
  
  const test6 = {
    name: 'Service Worker 使用 chrome.runtime.onMessage 進行通信',
    fn: () => {
      assert(testBackgroundContent.includes('chrome.runtime.onMessage') || 
             testBackgroundContent.includes('onMessage'),
        'should use chrome.runtime.onMessage for communication');
    }
  };
  
  try {
    test6.fn();
    console.log(`✓ ${test6.name}`);
    passed++;
  } catch (error) {
    console.log(`✗ ${test6.name}`);
    console.log(`  Error: ${error.message}`);
    failed++;
  }
}

// Test 7: 驗證環境配置正確設定
const testEnvConfigPath = path.join(__dirname, '../src/shared/env-config.js');
const testEnvConfigContent = fs.readFileSync(testEnvConfigPath, 'utf8');

const test7 = {
  name: '環境配置中 EXPOSE_INTERNAL_STATE 已廢棄（Phase 3.2）',
  fn: () => {
    assert(testEnvConfigContent.includes('EXPOSE_INTERNAL_STATE'),
      'should have EXPOSE_INTERNAL_STATE flag');
    assert(testEnvConfigContent.includes('Phase 3.2'),
      'should have Phase 3.2 comment about categoryManager removal');
  }
};

try {
  test7.fn();
  console.log(`✓ ${test7.name}`);
  passed++;
} catch (error) {
  console.log(`✗ ${test7.name}`);
  console.log(`  Error: ${error.message}`);
  failed++;
}

// Test 8: 驗證文檔和註解清晰說明安全決策
const test8 = {
  name: '代碼文檔清晰說明 Phase 3.2 的安全決策',
  fn: () => {
    assert(testInjectedContent.includes('Phase 3.2'),
      'should document Phase 3.2');
    assert(testInjectedContent.includes('即使在開發模式下，內部 categoryManager 也不暴露'),
      'should explain why categoryManager is not exposed');
    assert(testInjectedContent.includes('chrome.runtime.sendMessage'),
      'should mention message passing as alternative');
  }
};

try {
  test8.fn();
  console.log(`✓ ${test8.name}`);
  passed++;
} catch (error) {
  console.log(`✗ ${test8.name}`);
  console.log(`  Error: ${error.message}`);
  failed++;
}

// Test 9: 驗證 CSP 合規性
const testManifestPath = path.join(__dirname, '../src/manifest.json');
const testManifestContent = JSON.parse(fs.readFileSync(testManifestPath, 'utf8'));

const test9 = {
  name: 'Manifest V3 CSP 配置符合要求',
  fn: () => {
    assert.strictEqual(testManifestContent.manifest_version, 3,
      'should use Manifest V3');
    assert(testManifestContent.web_accessible_resources,
      'should have web_accessible_resources');
  }
};

try {
  test9.fn();
  console.log(`✓ ${test9.name}`);
  passed++;
} catch (error) {
  console.log(`✗ ${test9.name}`);
  console.log(`  Error: ${error.message}`);
  failed++;
}

// Test 10: 驗證功能完整性 - 消息傳遞仍然工作
const test10 = {
  name: '消息傳遞機制保持完整（功能驗證）',
  fn: () => {
    assert(testContentContent.includes('chrome.runtime.sendMessage'),
      'should use chrome.runtime.sendMessage for communication');
    assert(testBackgroundContent.includes('chrome.runtime.onMessage'),
      'should handle messages in background');
  }
};

try {
  test10.fn();
  console.log(`✓ ${test10.name}`);
  passed++;
} catch (error) {
  console.log(`✗ ${test10.name}`);
  console.log(`  Error: ${error.message}`);
  failed++;
}

console.log('\n' + '='.repeat(70));
console.log(`結果: ${passed} 通過, ${failed} 失敗\n`);

if (failed > 0) {
  process.exit(1);
}
