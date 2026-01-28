/**
 * Phase 2 - Injected Script Setup Tests
 *
 * 測試 injected.js 的跨世界通信功能
 * 確保 window._scm_getAngular() 和 window._scm_getScope() 正確暴露
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

// 簡化版測試框架
function runTests() {
  console.log('\n[Test] Phase 2 - Injected Script Setup Tests');
  console.log('=============================================\n');

  let passed = 0;
  let failed = 0;

  const tests = [
    // ============================================
    // 1. 檔案存在性檢查
    // ============================================
    {
      name: 'injected.js file exists',
      fn: () => {
        const injectedPath = path.join(__dirname, '../src/content/injected.js');
        assert(fs.existsSync(injectedPath), 'injected.js should exist');
      }
    },
    {
      name: 'init.js file exists',
      fn: () => {
        const initPath = path.join(__dirname, '../src/content/init.js');
        assert(fs.existsSync(initPath), 'init.js should exist');
      }
    },
    {
      name: 'manifest.json file exists',
      fn: () => {
        const manifestPath = path.join(__dirname, '../src/manifest.json');
        assert(fs.existsSync(manifestPath), 'manifest.json should exist');
      }
    },

    // ============================================
    // 2. injected.js 函數暴露檢查
    // ============================================
    {
      name: 'injected.js exposes _scm_getAngular function',
      fn: () => {
        const injectedPath = path.join(__dirname, '../src/content/injected.js');
        const content = fs.readFileSync(injectedPath, 'utf8');
        assert(content.includes('window._scm_getAngular'), 'should expose _scm_getAngular');
        assert(content.includes('window._scm_getAngular = function'), 'should be a function');
      }
    },
    {
      name: 'injected.js exposes _scm_getScope function',
      fn: () => {
        const injectedPath = path.join(__dirname, '../src/content/injected.js');
        const content = fs.readFileSync(injectedPath, 'utf8');
        assert(content.includes('window._scm_getScope'), 'should expose _scm_getScope');
        assert(content.includes('window._scm_getScope = function'), 'should be a function');
      }
    },
    {
      name: 'injected.js exposes _scm_injected_status function',
      fn: () => {
        const injectedPath = path.join(__dirname, '../src/content/injected.js');
        const content = fs.readFileSync(injectedPath, 'utf8');
        assert(content.includes('window._scm_injected_status'), 'should expose status function');
      }
    },

    // ============================================
    // 3. 錯誤處理檢查
    // ============================================
    {
      name: '_scm_getAngular has error handling for missing AngularJS',
      fn: () => {
        const injectedPath = path.join(__dirname, '../src/content/injected.js');
        const content = fs.readFileSync(injectedPath, 'utf8');
        const getAngularSection = content.substring(
          content.indexOf('window._scm_getAngular'),
          content.indexOf('window._scm_getAngular') + 2000
        );
        assert(getAngularSection.includes('return null'), 'should return null on error');
        assert(getAngularSection.includes('console.warn') || getAngularSection.includes('console.error'),
          'should log errors/warnings');
      }
    },
    {
      name: '_scm_getScope has error handling for invalid element',
      fn: () => {
        const injectedPath = path.join(__dirname, '../src/content/injected.js');
        const content = fs.readFileSync(injectedPath, 'utf8');
        const getScopeStart = content.indexOf('window._scm_getScope = function');
        const nextFunction = content.indexOf('window._scm_injected_status');
        const getScopeSection = content.substring(getScopeStart, nextFunction);
        assert(getScopeSection.includes('try'), 'should have try-catch');
        assert(getScopeSection.includes('catch'), 'should have catch block');
        assert(getScopeSection.includes('return null'), 'should return null on error');
      }
    },

    // ============================================
    // 4. init.js 注入檢查
    // ============================================
    {
      name: 'init.js uses chrome.runtime.getURL to inject injected.js',
      fn: () => {
        const initPath = path.join(__dirname, '../src/content/init.js');
        const content = fs.readFileSync(initPath, 'utf8');
        assert(content.includes('chrome.runtime.getURL'), 'should use getURL');
        assert(content.includes('content/injected.js'), 'should reference injected.js');
      }
    },
    {
      name: 'init.js sets nonce on injected script element',
      fn: () => {
        const initPath = path.join(__dirname, '../src/content/init.js');
        const content = fs.readFileSync(initPath, 'utf8');
        assert(content.includes('script.dataset.nonce'), 'should set nonce on script element');
      }
    },

    // ============================================
    // 5. manifest.json 配置檢查
    // ============================================
    {
      name: 'manifest.json includes injected.js in web_accessible_resources',
      fn: () => {
        const manifestPath = path.join(__dirname, '../src/manifest.json');
        const content = fs.readFileSync(manifestPath, 'utf8');
        const manifest = JSON.parse(content);

        assert(manifest.web_accessible_resources, 'should have web_accessible_resources');
        const resources = manifest.web_accessible_resources[0].resources;
        assert(resources.includes('content/injected.js'), 'injected.js should be in web_accessible_resources');
      }
    },
    {
      name: 'manifest.json content_scripts loads init.js first',
      fn: () => {
        const manifestPath = path.join(__dirname, '../src/manifest.json');
        const content = fs.readFileSync(manifestPath, 'utf8');
        const manifest = JSON.parse(content);

        assert(manifest.content_scripts, 'should have content_scripts');
        const scripts = manifest.content_scripts[0].js;
        assert(scripts[0] === 'content/init.js', 'init.js should be loaded first');
        assert(scripts.includes('content/content.js'), 'content.js should be loaded');
      }
    },
    {
      name: 'manifest.json sets content_scripts run_at to document_start',
      fn: () => {
        const manifestPath = path.join(__dirname, '../src/manifest.json');
        const content = fs.readFileSync(manifestPath, 'utf8');
        const manifest = JSON.parse(content);

        assert(manifest.content_scripts[0].run_at === 'document_start',
          'should run at document_start for early injection');
      }
    },

    // ============================================
    // 6. content.js 調用檢查
    // ============================================
    {
      name: 'content.js calls window._scm_getAngular()',
      fn: () => {
        const contentPath = path.join(__dirname, '../src/content/content.js');
        const content = fs.readFileSync(contentPath, 'utf8');
        assert(content.includes('window._scm_getAngular'), 'should call _scm_getAngular');
      }
    },
    {
      name: 'content.js checks for AngularJS availability',
      fn: () => {
        const contentPath = path.join(__dirname, '../src/content/content.js');
        const content = fs.readFileSync(contentPath, 'utf8');
        assert(content.includes('window.angular'), 'should check window.angular');
        assert(content.includes('_scm_getAngular()'), 'should call getter function');
      }
    },

    // ============================================
    // 7. 跨世界通信驗證
    // ============================================
    {
      name: 'injected.js runs in IIFE (Immediately Invoked Function Expression)',
      fn: () => {
        const injectedPath = path.join(__dirname, '../src/content/injected.js');
        const content = fs.readFileSync(injectedPath, 'utf8');
        assert(content.includes('(function()'), 'should use IIFE to avoid global scope pollution');
        assert(content.includes('})()'), 'should properly close IIFE');
      }
    },
    {
      name: 'injected.js broadcasts categoryManagerReady event',
      fn: () => {
        const injectedPath = path.join(__dirname, '../src/content/injected.js');
        const content = fs.readFileSync(injectedPath, 'utf8');
        assert(content.includes('categoryManagerReady'), 'should broadcast ready event');
        assert(content.includes('window.dispatchEvent'), 'should use CustomEvent');
      }
    },
    {
      name: 'init.js waits for categoryManagerReady event',
      fn: () => {
        const initPath = path.join(__dirname, '../src/content/init.js');
        const content = fs.readFileSync(initPath, 'utf8');
        assert(content.includes('categoryManagerReady'), 'should listen for ready event');
        assert(content.includes('waitForCategoryManagerReady'), 'should have wait function');
      }
    },

    // ============================================
    // 8. 安全性檢查
    // ============================================
    {
      name: 'init.js validates nonce for security',
      fn: () => {
        const initPath = path.join(__dirname, '../src/content/init.js');
        const content = fs.readFileSync(initPath, 'utf8');
        assert(content.includes('validateNonce'), 'should validate nonce');
        assert(content.includes('crypto.getRandomValues'), 'should use crypto for nonce generation');
      }
    },
    {
      name: 'injected.js does not expose CategoryManager to global scope',
      fn: () => {
        const injectedPath = path.join(__dirname, '../src/content/injected.js');
        const content = fs.readFileSync(injectedPath, 'utf8');
        // CategoryManager should be instantiated but not assigned to window
        assert(content.includes('const categoryManager = new CategoryManager'), 'should create instance');
        assert(!content.includes('window.categoryManager = '), 'should NOT expose to global scope');
      }
    },

    // ============================================
    // 9. 文檔化檢查
    // ============================================
    {
      name: '_scm_getAngular has documentation comments',
      fn: () => {
        const injectedPath = path.join(__dirname, '../src/content/injected.js');
        const content = fs.readFileSync(injectedPath, 'utf8');
        const getAngularSection = content.substring(
          content.indexOf('window._scm_getAngular'),
          content.indexOf('window._scm_getAngular') + 1500
        );
        assert(getAngularSection.includes('/**'), 'should have JSDoc comments');
        assert(getAngularSection.includes('@returns'), 'should document return value');
      }
    },
    {
      name: '_scm_getScope has documentation comments',
      fn: () => {
        const injectedPath = path.join(__dirname, '../src/content/injected.js');
        const content = fs.readFileSync(injectedPath, 'utf8');
        // 查找 _scm_getScope 函數前的文檔
        const getScopeIndex = content.indexOf('window._scm_getScope = function');
        const prevDocStart = content.lastIndexOf('/**', getScopeIndex);
        const docSection = content.substring(prevDocStart, getScopeIndex + 100);
        assert(docSection.includes('/**'), 'should have JSDoc comments');
        assert(docSection.includes('element'), 'should document element parameter');
        assert(docSection.includes('@returns'), 'should document return value');
      }
    }
  ];

  // 執行測試
  for (const test of tests) {
    try {
      test.fn();
      console.log(`✓ ${test.name}`);
      passed++;
    } catch (error) {
      console.error(`✗ ${test.name}`);
      console.error(`  Error: ${error.message}\n`);
      failed++;
    }
  }

  // 輸出摘要
  console.log(`\n=============================================`);
  console.log(`Tests passed: ${passed}/${tests.length}`);
  console.log(`Tests failed: ${failed}/${tests.length}`);
  console.log(`=============================================\n`);

  return failed === 0;
}

// 執行測試
if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runTests };
